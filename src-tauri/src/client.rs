use reqwest::{
    header::{HeaderMap, HeaderName, HeaderValue},
    Client, Method,
};
use serde::{Deserialize, Serialize};
use std::str::FromStr;
use std::time::Instant;

#[derive(Serialize, Deserialize, Debug)]
pub struct ClientRequest {
    pub method: String,
    pub url: String,
    pub headers: std::collections::HashMap<String, String>,
    pub body: Option<String>, // Base64 or Text? For MVP text/json.
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ClientResponse {
    pub status: u16,
    pub headers: std::collections::HashMap<String, String>,
    pub body: String, // Text content
    pub duration_ms: u64,
}

#[tauri::command]
pub async fn send_request(req: ClientRequest) -> Result<ClientResponse, String> {
    let client = Client::builder()
        .danger_accept_invalid_certs(true) // For dev tools usually expected
        .http2_prior_knowledge() // Optional, maybe auto?
        .build()
        .map_err(|e| e.to_string())?;

    let method = Method::from_str(&req.method).map_err(|e| e.to_string())?;

    let mut headers = HeaderMap::new();
    for (k, v) in req.headers {
        if let (Ok(n), Ok(val)) = (HeaderName::from_str(&k), HeaderValue::from_str(&v)) {
            headers.insert(n, val);
        }
    }

    let start = Instant::now();

    let mut request_builder = client.request(method, &req.url).headers(headers);

    if let Some(body) = req.body {
        request_builder = request_builder.body(body);
    }

    let response = request_builder.send().await.map_err(|e| e.to_string())?;

    let duration = start.elapsed().as_millis() as u64;
    let status = response.status().as_u16();

    let res_headers: std::collections::HashMap<String, String> = response
        .headers()
        .iter()
        .map(|(k, v)| (k.to_string(), v.to_str().unwrap_or("").to_string()))
        .collect();

    // Read body (text)
    let body_text = response.text().await.map_err(|e| e.to_string())?;

    Ok(ClientResponse {
        status,
        headers: res_headers,
        body: body_text,
        duration_ms: duration,
    })
}
