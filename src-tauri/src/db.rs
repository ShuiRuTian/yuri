use sea_orm::{ConnectionTrait, Database, DatabaseConnection, DbErr, Schema};
use std::path::PathBuf;
use tokio::fs;

pub mod requests {
    use sea_orm::entity::prelude::*;
    use serde::{Deserialize, Serialize};

    #[sea_orm::model]
    #[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
    #[sea_orm(table_name = "requests")]
    pub struct Model {
        #[sea_orm(primary_key, auto_increment = false)]
        pub id: String,
        pub method: String,
        pub url: String,
        pub protocol: String,        // "http", "grpc", "ws"
        pub request_headers: String, // JSON
        pub request_body: Option<Vec<u8>>,
        pub response_status: i32,
        pub response_headers: String, // JSON
        pub response_body: Option<Vec<u8>>,
        pub duration: i64,
        pub timestamp: i64,
    }

    impl ActiveModelBehavior for ActiveModel {}
}

pub mod proto_files {
    use sea_orm::entity::prelude::*;
    use serde::{Deserialize, Serialize};

    #[sea_orm::model]
    #[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
    #[sea_orm(table_name = "proto_files")]
    pub struct Model {
        #[sea_orm(primary_key, auto_increment = false)]
        pub id: String,
        pub name: String,
        pub content: String,
        pub added_at: i64,
    }

    impl ActiveModelBehavior for ActiveModel {}
}

pub mod rewrites {
    use sea_orm::entity::prelude::*;
    use serde::{Deserialize, Serialize};

    #[sea_orm::model]
    #[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
    #[sea_orm(table_name = "rewrites")]
    pub struct Model {
        #[sea_orm(primary_key, auto_increment = false)]
        pub id: String,
        pub name: String,
        pub enabled: bool,
        // Rules can be for: URL, Header(Request/Response), Body(Request/Response)
        pub rule_type: String,
        pub match_pattern: String, // Regex or string
        pub replace_with: String,
        pub location: String, // e.g., "request" or "response"
        pub action: String,   // "replace", "delete", "add"
    }

    impl ActiveModelBehavior for ActiveModel {}
}

use proto_files::Entity as ProtoFiles;
use requests::Entity as Requests;
use rewrites::Entity as Rewrites;

pub async fn init_db(app_dir: PathBuf) -> Result<DatabaseConnection, DbErr> {
    if !app_dir.exists() {
        fs::create_dir_all(&app_dir)
            .await
            .map_err(|e| DbErr::Custom(e.to_string()))?;
    }
    let db_path = app_dir.join("yuri.db");
    let db_url = format!("sqlite://{}?mode=rwc", db_path.to_string_lossy());

    let db = Database::connect(&db_url).await?;

    let module_path = module_path!();
    println!("Module path: {}", module_path);

    db.get_schema_registry(module_path!().split("::").next().unwrap())
        .sync(&db)
        .await?;

    Ok(db)
}
