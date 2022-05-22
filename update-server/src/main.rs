use actix_cors::Cors;
use actix_web::{App, get, http::StatusCode, HttpResponse, HttpServer, Responder};

use crate::class::Reply;
use crate::reader::{get_config, get_latest_file};
use crate::utils::parse_version;

mod class;
mod reader;
mod utils;

#[get("/api/fc/hello")]
async fn hello() -> impl Responder {
    let r = get_reply();
    if let Err(msg) = r {
        HttpResponse::Ok()
            .status(StatusCode::INTERNAL_SERVER_ERROR)
            .body(format!("{}", msg))
    } else {
        HttpResponse::Ok().json(r.unwrap())
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new()
            .wrap(
                Cors::default()
                    .allowed_origin("http://127.0.0.1:3344")
                    .allowed_origin("https://fc.edgeless.top")
                    .allowed_origin("app://.")
                    .allowed_methods(vec!["GET"])
            )
            .service(hello)
    })
        .bind(("127.0.0.1", 3080))?
        .run()
        .await
}

fn get_reply() -> Result<Reply, String> {
    let mut config = get_config()?;
    let latest_file = get_latest_file(config.path.local.clone())?;
    let latest_version = parse_version(&latest_file)?;
    config.latest.change_version(&latest_version);
    Ok(Reply::new(config, latest_file))
}
