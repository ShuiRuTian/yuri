use crate::db::rewrites;
use regex::Regex;
use sea_orm::{DatabaseConnection, EntityTrait};
use std::sync::{Arc, RwLock}; // RwLock for caching rules

#[derive(Clone, Debug)]
pub struct RewriteRule {
    pub id: String,
    pub rule_type: String, // "url", "header", "body"
    pub match_pattern: String,
    pub replace_with: String,
    pub location: String, // "request", "response"
    pub action: String,   // "replace", "delete", "add"
    pub enabled: bool,
}

impl From<rewrites::Model> for RewriteRule {
    fn from(model: rewrites::Model) -> Self {
        Self {
            id: model.id,
            rule_type: model.rule_type,
            match_pattern: model.match_pattern,
            replace_with: model.replace_with,
            location: model.location,
            action: model.action,
            enabled: model.enabled,
        }
    }
}

pub struct RewriteManager {
    rules: Arc<RwLock<Vec<RewriteRule>>>,
    db: DatabaseConnection,
}

impl RewriteManager {
    pub fn new(db: DatabaseConnection) -> Self {
        Self {
            rules: Arc::new(RwLock::new(Vec::new())),
            db,
        }
    }

    pub async fn load_rules(&self) {
        if let Ok(rules) = rewrites::Entity::find().all(&self.db).await {
            let mut cache = self.rules.write().unwrap();
            *cache = rules.into_iter().map(|r| r.into()).collect();
            println!("Loaded {} rewrite rules", cache.len());
        }
    }

    pub fn apply_request_url(&self, url: &str) -> String {
        let rules = self.rules.read().unwrap();
        let mut new_url = url.to_string();

        for rule in rules
            .iter()
            .filter(|r| r.enabled && r.location == "request" && r.rule_type == "url")
        {
            if let Ok(re) = Regex::new(&rule.match_pattern) {
                new_url = re.replace_all(&new_url, &rule.replace_with).to_string();
            }
        }
        new_url
    }

    pub fn apply_request_headers(&self, headers: &mut hudsucker::hyper::HeaderMap) {
        let rules = self.rules.read().unwrap();
        for rule in rules
            .iter()
            .filter(|r| r.enabled && r.location == "request" && r.rule_type == "header")
        {
            let key = rule.match_pattern.as_str();
            if let Ok(header_name) =
                hudsucker::hyper::header::HeaderName::from_bytes(key.as_bytes())
            {
                match rule.action.as_str() {
                    "add" | "replace" => {
                        if let Ok(val) =
                            hudsucker::hyper::header::HeaderValue::from_str(&rule.replace_with)
                        {
                            if rule.action == "add" {
                                headers.append(&header_name, val);
                            } else {
                                headers.insert(&header_name, val);
                            }
                        }
                    }
                    "delete" => {
                        headers.remove(&header_name);
                    }
                    _ => {}
                }
            }
        }
    }

    // Body rewrite needs byte manipulation, expensive. Assume String for now.
    pub fn apply_request_body(&self, body: Vec<u8>) -> Vec<u8> {
        let rules = self.rules.read().unwrap();
        let mut new_body = body;

        for rule in rules
            .iter()
            .filter(|r| r.enabled && r.location == "request" && r.rule_type == "body")
        {
            // Only support utf8 string replace for now
            if let Ok(text) = String::from_utf8(new_body.clone()) {
                if let Ok(re) = Regex::new(&rule.match_pattern) {
                    let replaced = re.replace_all(&text, &rule.replace_with).to_string();
                    new_body = replaced.into_bytes();
                }
            }
        }
        new_body
    }

    // Similarly for Response...
    pub fn apply_response_headers(&self, headers: &mut hudsucker::hyper::HeaderMap) {
        let rules = self.rules.read().unwrap();
        for rule in rules
            .iter()
            .filter(|r| r.enabled && r.location == "response" && r.rule_type == "header")
        {
            let key = rule.match_pattern.as_str();
            if let Ok(header_name) =
                hudsucker::hyper::header::HeaderName::from_bytes(key.as_bytes())
            {
                match rule.action.as_str() {
                    "add" | "replace" => {
                        if let Ok(val) =
                            hudsucker::hyper::header::HeaderValue::from_str(&rule.replace_with)
                        {
                            if rule.action == "add" {
                                headers.append(&header_name, val);
                            } else {
                                headers.insert(&header_name, val);
                            }
                        }
                    }
                    "delete" => {
                        headers.remove(&header_name);
                    }
                    _ => {}
                }
            }
        }
    }

    pub fn apply_response_body(&self, body: Vec<u8>) -> Vec<u8> {
        let rules = self.rules.read().unwrap();
        let mut new_body = body;

        for rule in rules
            .iter()
            .filter(|r| r.enabled && r.location == "response" && r.rule_type == "body")
        {
            if let Ok(text) = String::from_utf8(new_body.clone()) {
                if let Ok(re) = Regex::new(&rule.match_pattern) {
                    let replaced = re.replace_all(&text, &rule.replace_with).to_string();
                    new_body = replaced.into_bytes();
                }
            }
        }
        new_body
    }
}
