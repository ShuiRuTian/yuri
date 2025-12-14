use crate::rewrites::RewriteManager;
use crate::{db::requests, ProxyEventPayload};
use hudsucker::{
    async_trait::async_trait,
    hyper::{Body, Request, Response},
    HttpContext, HttpHandler, RequestOrResponse,
};
use sea_orm::{ActiveModelTrait, DatabaseConnection, Set};
use std::collections::VecDeque;
use std::sync::{Arc, Mutex};
use tokio::sync::broadcast;
use uuid::Uuid;

#[derive(Clone)]
pub struct ProxyHandler {
    pub db: DatabaseConnection,
    pub pending_ids: Arc<Mutex<VecDeque<String>>>,
    pub event_tx: broadcast::Sender<ProxyEventPayload>,
    pub rewrite_manager: Arc<RewriteManager>,
}

#[async_trait]
impl HttpHandler for ProxyHandler {
    async fn handle_request(
        &mut self,
        _ctx: &HttpContext,
        mut req: Request<Body>,
    ) -> RequestOrResponse {
        // Rewrite URL
        let new_url_str = self
            .rewrite_manager
            .apply_request_url(&req.uri().to_string());
        if let Ok(new_uri) = new_url_str.parse() {
            *req.uri_mut() = new_uri;
        }

        // Rewrite Headers
        self.rewrite_manager
            .apply_request_headers(req.headers_mut());

        let url = req.uri().to_string();
        let method = req.method().to_string();
        let req_id = Uuid::new_v4().to_string();

        {
            if let Ok(mut ids) = self.pending_ids.lock() {
                ids.push_back(req_id.clone());
            }
        }

        let protocol = if req
            .headers()
            .get("content-type")
            .map(|v| v.to_str().unwrap_or("").starts_with("application/grpc"))
            .unwrap_or(false)
        {
            "grpc"
        } else {
            "http"
        };

        let headers_map: std::collections::HashMap<String, String> = req
            .headers()
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_str().unwrap_or("").to_string()))
            .collect();
        let headers_json = serde_json::to_string(&headers_map).unwrap_or_default();

        let (parts, body) = req.into_parts();
        // Collect body using hyper 0.14
        let body_bytes = match hudsucker::hyper::body::to_bytes(body).await {
            Ok(collected) => collected.to_vec(),
            Err(e) => {
                eprintln!("Failed to read request body: {}", e);
                Vec::new()
            }
        };

        // Rewrite Body
        let body_bytes = self.rewrite_manager.apply_request_body(body_bytes);

        let db_record = requests::ActiveModel {
            id: Set(req_id.clone()),
            method: Set(method.clone()),
            url: Set(url.clone()),
            protocol: Set(protocol.to_string()),
            request_headers: Set(headers_json),
            request_body: Set(if body_bytes.is_empty() {
                None
            } else {
                Some(body_bytes.clone())
            }),
            timestamp: Set(chrono::Utc::now().timestamp_millis()),
            duration: Set(0),
            response_status: Set(0),
            response_headers: Set("".to_string()),
            response_body: Set(None),
        };

        let _ = db_record.insert(&self.db).await;

        let _ = self.event_tx.send(ProxyEventPayload {
            id: req_id.clone(),
            method: method.clone(),
            url: url.clone(),
            status: None,
            phase: "request".to_string(),
        });

        let new_req = Request::from_parts(parts, Body::from(body_bytes));
        RequestOrResponse::Request(new_req)
    }

    async fn handle_response(
        &mut self,
        _ctx: &HttpContext,
        mut res: Response<Body>,
    ) -> Response<Body> {
        // Rewrite Headers
        self.rewrite_manager
            .apply_response_headers(res.headers_mut());

        let req_id = {
            if let Ok(mut ids) = self.pending_ids.lock() {
                ids.pop_front()
            } else {
                None
            }
        };

        let (parts, body) = res.into_parts();
        let body_bytes = match hudsucker::hyper::body::to_bytes(body).await {
            Ok(collected) => collected.to_vec(),
            Err(e) => {
                eprintln!("Failed to read response body: {}", e);
                Vec::new()
            }
        };

        // Rewrite Body
        let body_bytes = self.rewrite_manager.apply_response_body(body_bytes);

        let status = parts.status.as_u16() as i32;

        if let Some(id) = req_id {
            let headers_map: std::collections::HashMap<String, String> = parts
                .headers
                .iter()
                .map(|(k, v)| (k.to_string(), v.to_str().unwrap_or("").to_string()))
                .collect();
            let headers_json = serde_json::to_string(&headers_map).unwrap_or_default();

            let update_model = requests::ActiveModel {
                id: Set(id.clone()),
                response_status: Set(status),
                response_headers: Set(headers_json),
                response_body: Set(if body_bytes.is_empty() {
                    None
                } else {
                    Some(body_bytes.clone())
                }),
                ..Default::default()
            };

            let _ = update_model.update(&self.db).await;

            let _ = self.event_tx.send(ProxyEventPayload {
                id,
                method: "".to_string(),
                url: "".to_string(),
                status: Some(status),
                phase: "response".to_string(),
            });
        }

        Response::from_parts(parts, Body::from(body_bytes))
    }
}
