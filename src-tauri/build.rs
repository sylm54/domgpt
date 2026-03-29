fn main() {
    let target_os = std::env::var("CARGO_CFG_TARGET_OS").unwrap_or_default();

    if target_os == "android" {
        let arch = std::env::var("CARGO_CFG_TARGET_ARCH").unwrap_or_default();
        let abi = match arch.as_str() {
            "aarch64" => "arm64-v8a",
            "arm" => "armeabi-v7a",
            "x86" => "x86",
            "x86_64" => "x86_64",
            other => panic!("Unknown Android ABI: {other}"),
        };
        let ort_dir = format!(
            "{}/ort-android/jni/{}",
            std::env::var("HOME").unwrap_or_default(),
            abi
        );
        println!("cargo:rustc-env=ORT_LIB_LOCATION={ort_dir}");
        println!("cargo:rustc-link-search=native={ort_dir}");
    }

    tauri_build::build()
}
