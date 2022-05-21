use std::fs::{File,read_dir};
use std::io::Read;
use std::path::Path;

use regex::Regex;
use crate::class::Config;

const CONFIG_PATH: &str ="./config.json";

pub fn get_config() -> Result<Config,String>{
    let file=File::open(CONFIG_PATH);
    if let Err(_)=file {
        return Err(String::from("Can't read config"));
    }
    let mut text=String::new();
    file.unwrap().read_to_string(&mut text).unwrap();
    let r: serde_json::Result<Config>=serde_json::from_str(&text);
    if let Err(_)=r{
        return Err(String::from("Can't parse config"));
    }
    Ok(r.unwrap())
}

pub fn get_latest_file(path :String)->Result<String,String>{
    if !Path::new(&path).exists() {
        return Err(String::from("Path not exist"));
    }
    let dir=read_dir(path);
    if let Err(_)=dir{
        return Err(String::from("Can't read as directory"));
    }
    let regex=Regex::new(r"^Flash Collector_[\d\.]+_win-x64\.7z$").unwrap();
    let mut found=false;
    let mut result=String::new();

    for entry in dir.unwrap() {
        let e=entry.unwrap().file_name().clone();
        let true_name=e.to_str().unwrap().clone();
        if regex.is_match(&true_name){
            if found {
                result=cmp(String::from(true_name),String::from(result));
            }else{
                result=String::from(true_name);
                found=true;
            }
        }
    }

    if found {
        Ok(result)
    }else{
        Err(String::from("Can't match file"))
    }
}

fn cmp(a:String,b:String)->String{
    if a.cmp(&b)==std::cmp::Ordering::Greater{
        a
    }else {
        b
    }
}