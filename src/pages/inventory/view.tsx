import type React from "react";
import { useState, useEffect, useRef, useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  loadInventoryData,
  saveInventoryData,
  addItem,
  getAllItems,
  getAllTags,
  getAllKeys,
} from "./types";
import type {
  InventoryItem,
  AdditionalData,
  AdditionalDataValue,
} from "./types";
import { generateTags } from "./agent";
import {
  Loader2,
  Camera,
  Upload,
  X,
  PackageIcon,
  TagIcon,
  ImageIcon,
  PlusIcon,
  KeyIcon,
  Trash2Icon,
} from "lucide-react";
import { saveImage, loadImage } from "./image-store";
import { PageLayout } from "@/components/PageLayout";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { useConfig } from "@/contexts/ConfigContext";

const ItemImage = ({ src, alt }: { src: string; alt: string }) => {
  const [imageSrc, setImageSrc] = useState<string>("");

  useEffect(() => {
    if (src.startsWith("http") || src.startsWith("data:")) {
      setImageSrc(src);
    } else {
      // Assume local filename
      loadImage(src).then(setImageSrc);
    }
  }, [src]);

  if (!imageSrc) return null;

  return (
    <div className="aspect-video w-full overflow-hidden bg-pink-100 dark:bg-pink-900/20 rounded-xl">
      <img
        src={imageSrc}
        alt={alt}
        className="w-full h-full object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
    </div>
  );
};

interface KeyValueEntry {
  id: string;
  key: string;
  value: string;
  type: "string" | "number";
}

interface KeyValueEditorProps {
  entries: KeyValueEntry[];
  onChange: (entries: KeyValueEntry[]) => void;
  existingKeys: string[];
}

const KeyValueEditor = ({
  entries,
  onChange,
  existingKeys,
}: KeyValueEditorProps) => {
  const addEntry = () => {
    onChange([
      ...entries,
      { id: crypto.randomUUID(), key: "", value: "", type: "string" },
    ]);
  };

  const removeEntry = (index: number) => {
    onChange(entries.filter((_, i) => i !== index));
  };

  const updateEntry = (
    index: number,
    field: keyof KeyValueEntry,
    value: string,
  ) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    onChange(newEntries);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground flex items-center gap-2">
          <KeyIcon className="w-4 h-4 text-pink-500" />
          Additional Data
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addEntry}
          className="h-7 text-xs border-pink-200 hover:bg-pink-50 hover:border-pink-300 dark:border-pink-500/30 dark:hover:bg-pink-900/20 rounded-lg"
        >
          <PlusIcon className="w-3 h-3 mr-1" />
          Add Field
        </Button>
      </div>

      {existingKeys.length > 0 && (
        <div className="text-xs text-muted-foreground">
          Existing keys:{" "}
          <span className="text-pink-500">{existingKeys.join(", ")}</span>
        </div>
      )}

      {entries.map((entry, index) => (
        <div key={entry.id} className="flex gap-2 items-start">
          <div className="flex-1">
            <Input
              value={entry.key}
              onChange={(e) => updateEntry(index, "key", e.target.value)}
              placeholder="Key"
              list={`keys-${index}`}
              className="bg-white/50 dark:bg-card/50 border-pink-200 dark:border-pink-500/30 focus:border-pink-400 focus:ring-pink-400/30 rounded-lg text-sm"
            />
            <datalist id={`keys-${index}`}>
              {existingKeys.map((k) => (
                <option key={k} value={k} />
              ))}
            </datalist>
          </div>
          <div className="flex-1">
            <Input
              value={entry.value}
              onChange={(e) => updateEntry(index, "value", e.target.value)}
              placeholder="Value"
              className="bg-white/50 dark:bg-card/50 border-pink-200 dark:border-pink-500/30 focus:border-pink-400 focus:ring-pink-400/30 rounded-lg text-sm"
            />
          </div>
          <select
            value={entry.type}
            onChange={(e) =>
              updateEntry(index, "type", e.target.value as "string" | "number")
            }
            className="h-9 px-2 rounded-lg border border-pink-200 dark:border-pink-500/30 bg-white/50 dark:bg-card/50 text-sm focus:border-pink-400 focus:ring-pink-400/30"
          >
            <option value="string">Text</option>
            <option value="number">Number</option>
          </select>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeEntry(index)}
            className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2Icon className="w-4 h-4" />
          </Button>
        </div>
      ))}

      {entries.length === 0 && (
        <p className="text-xs text-muted-foreground italic">
          No additional data. Click "Add Field" to add key-value pairs.
        </p>
      )}
    </div>
  );
};

const AdditionalDataDisplay = ({ data }: { data: AdditionalData }) => {
  const entries = Object.entries(data);
  if (entries.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-pink-100 dark:border-pink-900/30">
      <div className="flex items-center gap-1 mb-2">
        <KeyIcon className="w-3 h-3 text-pink-400" />
        <span className="text-xs font-medium text-muted-foreground">
          Properties
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs">
            <span className="font-medium text-foreground/70">{key}:</span>
            <span className="text-foreground">
              {typeof value === "number" ? value.toLocaleString() : value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function InventoryView() {
  const { uiText } = useConfig();
  const nameId = useId();
  const descriptionId = useId();
  const imageId = useId();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [existingKeys, setExistingKeys] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageInput, setImageInput] = useState(""); // URL input
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [capturedImage, setCapturedImage] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [additionalDataEntries, setAdditionalDataEntries] = useState<
    KeyValueEntry[]
  >([]);

  const setAdditionalDataEntriesStable = (newEntries: KeyValueEntry[]) => {
    // Ensure all entries have IDs
    const entriesWithIds = newEntries.map((e) => ({
      ...e,
      id: e.id || crypto.randomUUID(),
    }));
    setAdditionalDataEntries(entriesWithIds);
  };

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const data = loadInventoryData();
    setItems(getAllItems(data));
    setExistingTags(getAllTags(data));
    setExistingKeys(getAllKeys(data));
  }, []);

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCamera(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            setCapturedImage(blob);
            setPreviewUrl(URL.createObjectURL(blob));
            setSelectedFile(null);
            setImageInput("");
            stopCamera();
          }
        }, "image/jpeg");
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setCapturedImage(null);
      setImageInput("");
    }
  };

  const clearImage = () => {
    setSelectedFile(null);
    setCapturedImage(null);
    setPreviewUrl("");
    setImageInput("");
  };

  const convertEntriesToAdditionalData = (
    entries: KeyValueEntry[],
  ): AdditionalData => {
    const result: AdditionalData = {};
    for (const entry of entries) {
      if (entry.key.trim()) {
        let value: AdditionalDataValue;
        if (entry.type === "number") {
          const parsed = parseFloat(entry.value);
          value = Number.isNaN(parsed) ? 0 : parsed;
        } else {
          value = entry.value;
        }
        result[entry.key.trim()] = value;
      }
    }
    return result;
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !description) return;

    setIsGeneratingTags(true);
    try {
      // Handle image saving
      let finalImage = imageInput;
      if (selectedFile) {
        finalImage = await saveImage(selectedFile);
      } else if (capturedImage) {
        finalImage = await saveImage(capturedImage);
      }

      // Convert additional data entries
      const additionalData = convertEntriesToAdditionalData(
        additionalDataEntries,
      );

      // Generate tags using the agent (now with existing keys)
      const tags = await generateTags(
        name,
        description,
        existingTags,
        existingKeys,
      );

      const data = loadInventoryData();
      const newData = addItem(
        data,
        name,
        description,
        finalImage,
        tags,
        additionalData,
      );
      saveInventoryData(newData);
      setItems(getAllItems(newData));
      setExistingTags(getAllTags(newData));
      setExistingKeys(getAllKeys(newData));

      // Reset form
      setName("");
      setDescription("");
      setImageInput("");
      setAdditionalDataEntries([]);
      clearImage();
      setShowAddForm(false);
    } catch (error) {
      console.error("Error adding item:", error);
    } finally {
      setIsGeneratingTags(false);
    }
  };

  return (
    <PageLayout>
      <PageHeader
        title={uiText.inventory?.title || "Inventory"}
        subtitle={
          items.length > 0 ? (
            <div className="flex items-center gap-2">
              <PackageIcon className="w-4 h-4" />
              <span>
                {items.length} item{items.length !== 1 ? "s" : ""}
              </span>
            </div>
          ) : null
        }
        action={
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-white text-pink-600 hover:bg-white/90 font-semibold shadow-md"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 sm:pb-32">
        <div className="max-w-6xl mx-auto">
          {/* Add Item Form */}
          {showAddForm && (
            <div className="bg-white/80 dark:bg-card/80 backdrop-blur-sm rounded-2xl p-5 sm:p-6 shadow-lg border border-pink-200/50 dark:border-pink-500/20 mb-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-pink-500 flex items-center justify-center shadow-md">
                  <PlusIcon className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-foreground">
                  Add New Item
                </h2>
              </div>

              <form onSubmit={handleAddItem} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label
                      htmlFor={nameId}
                      className="text-sm font-semibold text-foreground"
                    >
                      Name
                    </label>
                    <Input
                      id={nameId}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Item name"
                      required
                      className="bg-white/50 dark:bg-card/50 border-pink-200 dark:border-pink-500/30 focus:border-pink-400 focus:ring-pink-400/30 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor={descriptionId}
                      className="text-sm font-semibold text-foreground"
                    >
                      Description
                    </label>
                    <Textarea
                      id={descriptionId}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe the item..."
                      required
                      className="bg-white/50 dark:bg-card/50 border-pink-200 dark:border-pink-500/30 focus:border-pink-400 focus:ring-pink-400/30 rounded-xl min-h-[80px]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor={imageId}
                    className="text-sm font-semibold text-foreground flex items-center gap-2"
                  >
                    <ImageIcon className="w-4 h-4 text-pink-500" />
                    Image
                  </label>

                  {!showCamera && !previewUrl && (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1 border-pink-200 hover:bg-pink-50 hover:border-pink-300 dark:border-pink-500/30 dark:hover:bg-pink-900/20 rounded-xl"
                          onClick={() =>
                            document.getElementById(imageId)?.click()
                          }
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {uiText.inventory?.upload_label || "Upload"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1 border-pink-200 hover:bg-pink-50 hover:border-pink-300 dark:border-pink-500/30 dark:hover:bg-pink-900/20 rounded-xl"
                          onClick={startCamera}
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          {uiText.inventory?.camera_label || "Camera"}
                        </Button>
                      </div>
                      <Input
                        id={imageId}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                      <div className="text-center text-xs text-muted-foreground">
                        - OR -
                      </div>
                      <Input
                        value={imageInput}
                        onChange={(e) => setImageInput(e.target.value)}
                        placeholder="Enter Image URL"
                        className="bg-white/50 dark:bg-card/50 border-pink-200 dark:border-pink-500/30 focus:border-pink-400 focus:ring-pink-400/30 rounded-xl"
                      />
                    </div>
                  )}

                  {showCamera && (
                    <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      >
                        <track kind="captions" />
                      </video>
                      <canvas ref={canvasRef} className="hidden" />
                      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
                        <Button
                          type="button"
                          onClick={capturePhoto}
                          size="sm"
                          className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white rounded-xl"
                        >
                          Capture
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={stopCamera}
                          size="sm"
                          className="rounded-xl"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {previewUrl && (
                    <div className="relative rounded-xl overflow-hidden border border-pink-200 dark:border-pink-500/30 aspect-video">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8 rounded-lg"
                        onClick={clearImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Additional Data Editor */}
                <KeyValueEditor
                  entries={additionalDataEntries}
                  onChange={setAdditionalDataEntriesStable}
                  existingKeys={existingKeys}
                />

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 border-pink-200 hover:bg-pink-50 hover:border-pink-300 dark:border-pink-500/30 dark:hover:bg-pink-900/20 rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-semibold rounded-xl shadow-md shadow-pink-300/30"
                    disabled={isGeneratingTags}
                  >
                    {isGeneratingTags ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating Tags...
                      </>
                    ) : (
                      "Add Item"
                    )}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Items Grid */}
          {items.length === 0 ? (
            <EmptyState
              icon={PackageIcon}
              title={uiText.inventory?.no_items || "No items yet"}
              description={
                uiText.inventory?.no_items_desc ||
                "Start adding items to your inventory"
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white/80 dark:bg-card/80 backdrop-blur-sm rounded-2xl overflow-hidden shadow-lg border border-pink-200/50 dark:border-pink-500/20 hover:shadow-xl hover:border-pink-300/50 dark:hover:border-pink-500/30 transition-all duration-200"
                >
                  {item.image && <ItemImage src={item.image} alt={item.name} />}

                  <div className="p-5">
                    <h3 className="font-bold text-lg text-foreground mb-2">
                      {item.name}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed mb-4">
                      {item.description}
                    </p>

                    {item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {item.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-pink-100 to-pink-200 dark:from-pink-900/40 dark:to-pink-800/40 text-pink-600 dark:text-pink-400 text-xs font-semibold rounded-lg"
                          >
                            <TagIcon className="w-3 h-3" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Display Additional Data */}
                    <AdditionalDataDisplay data={item.additionalData} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Info Card */}
          {items.length > 0 && (
            <div className="bg-gradient-to-r from-pink-500/10 to-pink-600/10 rounded-2xl p-5 border border-pink-200/50 dark:border-pink-500/20 mt-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-md">
                  <PackageIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    About Inventory
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Your inventory helps you keep track of items. Tags are
                    automatically generated using AI to help you organize and
                    search your items. You can add custom properties (key-value
                    pairs) for additional data like size, color, price, etc.
                  </p>
                  {existingKeys.length > 0 && (
                    <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                      <span className="font-medium">Current keys:</span>{" "}
                      {existingKeys.join(", ")}
                    </p>
                  )}
                  {existingTags.length > 0 && (
                    <p className="text-sm text-muted-foreground leading-relaxed mt-1">
                      <span className="font-medium">Current tags:</span>{" "}
                      {existingTags.join(", ")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
