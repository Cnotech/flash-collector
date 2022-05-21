mod class;
mod reader;
mod utils;

use actix_web::{get, App, HttpResponse, HttpServer, Responder,http::StatusCode};
use crate::reader::{get_config,get_latest_file};
use crate::class::{Reply,Config};
use crate::utils::{parse_version};

#[get("/hello")]
async fn hello() -> impl Responder {
    let r=get_reply();
    if let Err(msg)=r{
        HttpResponse::Ok()
        .status(StatusCode::INTERNAL_SERVER_ERROR)
        .body(format!("{}",msg))
    }else{
        HttpResponse::Ok().json(r.unwrap())
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new()
            .service(hello)
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}

fn get_reply()->Result<Reply,String>{
    let mut config=get_config()?;
    let latest_file=get_latest_file(config.path.local.clone())?;
    let latest_version=parse_version(&latest_file)?;
    config.latest.change_version(&latest_version);
    Ok(Reply::new(config, latest_file))
}