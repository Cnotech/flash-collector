use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct Latest {
    pub page: String,
    pub version: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Update {
    pub allow_normal_since: String,
    pub force_update_until: String,
    pub wide_gaps: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Path {
    pub local: String,
    pub url: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Notice {
    id: String,
    lower_than: String,
    level: String,
    message: String,
    description: String,
    close_text: String,
    allow_ignore: bool,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Package {
    pub full: String,
    pub update: String,
    pub extended_update: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Config {
    pub latest: Latest,
    pub update: Update,
    pub path: Path,
    pub notice: Vec<Notice>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Reply {
    pub package: Package,
    pub latest: Latest,
    pub update: Update,
    pub notice: Vec<Notice>,
}

impl Latest {
    pub fn change_version(&mut self, new_version: &String) {
        self.version = new_version.clone();
    }
}

impl Reply {
    pub fn new(config: Config, latest_file: String) -> Self {
        let package = Package {
            full: config.path.url.clone() + "/" + &latest_file,
            update: config.path.url.clone() + "/update/update.7z",
            extended_update: config.path.url.clone() + "/update/extended_update.7z",
        };
        Self {
            latest: config.latest,
            update: config.update,
            notice: config.notice,
            package,
        }
    }
}
