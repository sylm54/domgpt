import {
  BaseDirectory,
  exists,
  mkdir,
  writeFile,
  readFile,
} from "@tauri-apps/plugin-fs";

const IMAGE_DIR = "images";

/**
 * Ensure the images directory exists
 */
export async function initImageDir() {
  try {
    const dirExists = await exists(IMAGE_DIR, {
      baseDir: BaseDirectory.AppData,
    });
    if (!dirExists) {
      await mkdir(IMAGE_DIR, {
        baseDir: BaseDirectory.AppData,
        recursive: true,
      });
    }
  } catch (error) {
    console.error("Failed to initialize image directory:", error);
  }
}

/**
 * Save an image file and return the filename
 */
export async function saveImage(file: File | Blob): Promise<string> {
  await initImageDir();

  const buffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(buffer);
  const filename = `${crypto.randomUUID()}.jpg`; // Assume jpg for simplicity or extract ext

  try {
    // We can't easily join paths with BaseDirectory in the write call directly if we want to use the string path
    // But writeBinaryFile takes options.
    // Actually, the path argument for writeBinaryFile is relative to baseDir if provided.
    // So we just need "images/filename.jpg"

    const path = `${IMAGE_DIR}/${filename}`;
    await writeFile(filename, uint8Array, {
      baseDir: BaseDirectory.AppLocalData,
    });
    return filename;
  } catch (error) {
    console.error("Failed to save image:", error);
    throw error;
  }
}

/**
 * Load an image and return a Data URL for display
 */
export async function loadImage(filename: string): Promise<string> {
  try {
    const path = `${IMAGE_DIR}/${filename}`;
    const data = await readFile(filename, {
      baseDir: BaseDirectory.AppLocalData,
    });

    // Convert to base64
    let binary = "";
    const len = data.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(data[i]);
    }
    const base64 = btoa(binary);
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error("Failed to load image:", error);
    return "";
  }
}
