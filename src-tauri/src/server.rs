use crate::db::requests;
use crate::AppState;
use axum::{
    extract::{
        ws::{Message, WebSocket},
        Path, State, WebSocketUpgrade,
    },
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use sea_orm::EntityTrait;
use serde::Serialize;
use std::net::SocketAddr;
use std::sync::Arc;
use tower_http::cors::CorsLayer;

#[derive(Serialize)]
struct SystemInfo {
    status: String,
}

// Handler for WebSocket upgrade
async fn ws_handler(ws: WebSocketUpgrade, State(state): State<Arc<AppState>>) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

async fn handle_socket(mut socket: WebSocket, state: Arc<AppState>) {
    let mut rx = state.proxy_event_tx.subscribe();

    while let Ok(msg) = rx.recv().await {
        if let Ok(json) = serde_json::to_string(&msg) {
            if socket.send(Message::Text(json)).await.is_err() {
                break;
            }
        }
    }
}

// REST Handlers
async fn get_status() -> Json<SystemInfo> {
    Json(SystemInfo {
        status: "running".to_string(),
    })
}

async fn get_request_details(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let result = requests::Entity::find_by_id(id).one(&state.db).await;

    match result {
        Ok(Some(request)) => Json(request).into_response(),
        Ok(None) => (axum::http::StatusCode::NOT_FOUND, "Request not found").into_response(),
        Err(e) => (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

pub async fn run(state: Arc<AppState>, port: u16) {
    let app = Router::new()
        .route("/api/status", get(get_status))
        .route("/api/requests/:id", get(get_request_details))
        .route("/ws/events", get(ws_handler))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    println!("Server listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
