use hudsucker::{certificate_authority::RcgenAuthority, Proxy};
use sea_orm::DatabaseConnection;
use std::net::SocketAddr;
use std::sync::{Arc, Mutex};
use tauri::{App, AppHandle, Manager, State};
use tokio::sync::{broadcast, oneshot};

pub mod certs;
pub mod client;
pub mod db;
pub mod proxy;
pub mod rewrites;
pub mod server;

// Define payload here or in proxy
#[derive(Clone, serde::Serialize, Debug)]
pub struct ProxyEventPayload {
    pub id: String,
    pub method: String,
    pub url: String,
    pub status: Option<i32>,
    pub phase: String,
}

pub struct AppState {
    pub db: DatabaseConnection,
    pub proxy_shutdown_tx: Mutex<Option<oneshot::Sender<()>>>,
    pub proxy_event_tx: broadcast::Sender<ProxyEventPayload>,
    pub rewrite_manager: Arc<rewrites::RewriteManager>,
}

#[tauri::command]
async fn get_ca_cert(app_handle: AppHandle) -> Result<String, String> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    let ca_manager = certs::CaManager::new(app_dir).map_err(|e| e.to_string())?;
    Ok(ca_manager.get_ca_pem())
}

#[tauri::command]
async fn start_proxy(
    state: State<'_, Arc<AppState>>,
    app_handle: AppHandle,
    port: u16,
) -> Result<String, String> {
    let mut guard = state.proxy_shutdown_tx.lock().unwrap();
    if guard.is_some() {
        return Err("Proxy already running".into());
    }

    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    // Silence warning
    let _ca_manager = certs::CaManager::new(app_dir.clone()).map_err(|e| e.to_string())?;

    // REGENERATE STRATEGY
    let mut params = rcgen::CertificateParams::default();
    params
        .distinguished_name
        .push(rcgen::DnType::CommonName, "Yuri Proxy CA");
    params.is_ca = rcgen::IsCa::Ca(rcgen::BasicConstraints::Constrained(0));

    let key_pair = rcgen::KeyPair::generate().map_err(|e| e.to_string())?;
    let cert = params.self_signed(&key_pair).map_err(|e| e.to_string())?;

    let cert_der = cert.der().to_vec();
    let key_der = key_pair.serialize_der();

    let private_key = hudsucker::rustls::PrivateKey(key_der);
    let ca_cert = hudsucker::rustls::Certificate(cert_der);

    let ca = RcgenAuthority::new(private_key, ca_cert, 1000).map_err(|e| e.to_string())?;

    let handler = proxy::ProxyHandler {
        db: state.db.clone(),
        pending_ids: Arc::new(Mutex::new(std::collections::VecDeque::new())),
        event_tx: state.proxy_event_tx.clone(),
        rewrite_manager: state.rewrite_manager.clone(),
    };

    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    let proxy = Proxy::builder()
        .with_addr(addr)
        .with_rustls_client()
        .with_ca(ca)
        .with_http_handler(handler)
        .build();

    let (tx, rx) = oneshot::channel();
    *guard = Some(tx);

    tauri::async_runtime::spawn(async move {
        if let Err(e) = proxy
            .start(async {
                rx.await.ok();
                println!("Proxy shutdown signal received");
            })
            .await
        {
            eprintln!("Proxy failed: {}", e);
        }
    });

    Ok(format!("Proxy started on {}", port))
}

#[tauri::command]
async fn stop_proxy(state: State<'_, AppState>) -> Result<(), String> {
    let mut guard = state.proxy_shutdown_tx.lock().unwrap();
    if let Some(tx) = guard.take() {
        let _ = tx.send(());
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app: &mut App| {
            let app_handle = app.handle().clone();
            let app_dir = app.path().app_data_dir().expect("failed to get app dir");

            println!("App dir: {}", app_dir.display());

            tauri::async_runtime::block_on(async move {
                let db = db::init_db(app_dir).await.expect("failed to init db");
                let (tx, _rx) = broadcast::channel(100);

                let rewrite_manager = Arc::new(rewrites::RewriteManager::new(db.clone()));
                rewrite_manager.load_rules().await;

                let state = Arc::new(AppState {
                    db,
                    proxy_shutdown_tx: Mutex::new(None),
                    proxy_event_tx: tx,
                    rewrite_manager,
                });

                app_handle.manage(state.clone());

                // Spawn axum server
                tokio::spawn(server::run(state.clone(), 3000));
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_ca_cert,
            start_proxy,
            stop_proxy,
            client::send_request
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
