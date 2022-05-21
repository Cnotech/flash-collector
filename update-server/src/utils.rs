pub fn parse_version(file_name: &String) -> Result<String, String> {
    let version_regex = regex::Regex::new(r"[\d\.]+").unwrap();
    let res = version_regex.find(&file_name);
    if res.is_none() {
        return Err(String::from("Can't match version"));
    } else {
        Ok(String::from(res.unwrap().as_str()))
    }
}
