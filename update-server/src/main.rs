mod class;

use std::fs::File;
use std::io::Read;
use actix_web::{get, App, HttpResponse, HttpServer, Responder};
use crate::class::Config;

const CONFIG_PATH: &str ="./config.json";

#[get("/hello")]
async fn hello() -> impl Responder {
    HttpResponse::Ok().json(get_config())
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

fn get_config() -> Result<Config,&'static str>{
    let file=File::open(CONFIG_PATH);
    if let Err(_)=file {
        return Err("Can't read config");
    }
    let mut text=String::new();
    file.unwrap().read_to_string(&mut text).unwrap();
    let r: serde_json::Result<Config>=serde_json::from_str(&text);
    if let Err(_)=r{
        return Err("Can't parse config");
    }
    Ok(r.unwrap())
}

