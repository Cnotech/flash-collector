use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
struct Latest {
    page:String
}
#[derive(Serialize, Deserialize, Clone)]
struct Update {
    allow_mini_since:String,
    force_update_until:String,
    wide_gaps:Vec<String>
}
#[derive(Serialize, Deserialize, Clone)]
struct Path {
    local:String,
    url:String
}

#[derive(Serialize, Deserialize, Clone)]
struct Notice{
    id:String,
    lower_than:Option<String>,
    level:String,
    message:String,
    description:String,
    close_text:String,
    allow_ignore:bool
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Config{
    latest:Latest,
    update:Update,
    path:Path,
    notice:Vec<Notice>
}
