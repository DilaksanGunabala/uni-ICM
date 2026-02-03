import { useState, useRef, useCallback } from "react";
import Cropper from "react-easy-crop";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Camera, Upload, Trash2, X, Loader2, ImageIcon, Pencil, Crop, ZoomIn, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileImageEditorProps {
  currentImage?: string | null;
  name: string;
  onUpload: (file: File) => Promise<void>;
  onDelete: () => Promise<void>;
  isLoading?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
}

interface CroppedAreaPixels {
  x: number;
  y: number;
  width: number;
  height: number;
}

const sizeClasses = {
  sm: { container: "h-16 w-16", text: "text-lg", icon: "h-4 w-4", badge: "p-1" },
  md: { container: "h-20 w-20", text: "text-xl", icon: "h-5 w-5", badge: "p-1.5" },
  lg: { container: "h-24 w-24", text: "text-2xl", icon: "h-6 w-6", badge: "p-1.5" },
  xl: { container: "h-32 w-32", text: "text-3xl", icon: "h-7 w-7", badge: "p-2" },
};

// Helper function to create cropped image
const createCroppedImage = async (
  imageSrc: string,
  pixelCrop: CroppedAreaPixels,
  rotation: number = 0
): Promise<Blob> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No 2d context");
  }

  // Set canvas size to the cropped area size
  const outputSize = Math.max(pixelCrop.width, pixelCrop.height);
  canvas.width = outputSize;
  canvas.height = outputSize;

  // Fill with white background (for transparent images)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Calculate the center of the canvas
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  // Move to center, rotate, then move back
  ctx.translate(centerX, centerY);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-centerX, -centerY);

  // Draw the cropped image centered in the canvas
  const offsetX = (outputSize - pixelCrop.width) / 2;
  const offsetY = (outputSize - pixelCrop.height) / 2;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    offsetX,
    offsetY,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Canvas is empty"));
        }
      },
      "image/jpeg",
      0.95
    );
  });
};

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.crossOrigin = "anonymous";
    image.src = url;
  });

export function ProfileImageEditor({
  currentImage,
  name,
  onUpload,
  onDelete,
  isLoading = false,
  size = "lg",
}: ProfileImageEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Cropping states
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [croppedPreview, setCroppedPreview] = useState<string | null>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CroppedAreaPixels | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const onCropComplete = useCallback(
    (_croppedArea: { x: number; y: number; width: number; height: number }, croppedAreaPixels: CroppedAreaPixels) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      alert("Please upload a JPG, PNG, GIF, or WEBP image.");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert("Please upload an image smaller than 5MB.");
      return;
    }

    // Create image source for cropper
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageSrc(e.target?.result as string);
      setIsCropping(true);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
    };
    reader.readAsDataURL(file);
  };

  const handleCropApply = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    try {
      const croppedBlob = await createCroppedImage(imageSrc, croppedAreaPixels, rotation);
      const croppedUrl = URL.createObjectURL(croppedBlob);

      setCroppedPreview(croppedUrl);
      setCroppedBlob(croppedBlob);
      setIsCropping(false);
    } catch (error) {
      console.error("Error cropping image:", error);
      alert("Failed to crop image. Please try again.");
    }
  };

  const handleUpload = async () => {
    if (!croppedBlob) return;

    try {
      setIsUploading(true);

      // Convert blob to file
      const file = new File([croppedBlob], "profile-photo.jpg", {
        type: "image/jpeg",
      });

      await onUpload(file);
      handleClose();
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onDelete();
      handleClose();
    } catch (error) {
      console.error("Delete failed:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setImageSrc(null);
    setCroppedPreview(null);
    setCroppedBlob(null);
    setIsCropping(false);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCancelCrop = () => {
    setIsCropping(false);
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setImageSrc(null);
    setCroppedPreview(null);
    setCroppedBlob(null);
    setIsCropping(false);
  };

  const displayImage = croppedPreview || currentImage;
  const sizeConfig = sizeClasses[size];

  return (
    <>
      {/* Clickable Avatar with Camera Overlay */}
      <div className="relative group">
        <button
          type="button"
          onClick={handleOpen}
          disabled={isLoading}
          className={cn(
            "relative rounded-full overflow-hidden transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 border-2 border-border bg-muted",
            sizeConfig.container
          )}
        >
          {/* Image or Initials */}
          {currentImage ? (
            <img
              src={currentImage}
              alt={name}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-primary/10">
              <span className={cn("font-semibold text-primary", sizeConfig.text)}>
                {getInitials(name)}
              </span>
            </div>
          )}

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className={cn("text-white", sizeConfig.icon)} />
          </div>

          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className={cn("text-white animate-spin", sizeConfig.icon)} />
            </div>
          )}
        </button>

        {/* Small Camera Badge */}
        <div className={cn(
          "absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full shadow-lg border-2 border-background",
          sizeConfig.badge
        )}>
          <Camera className="h-3 w-3" />
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className={cn("sm:max-w-md", isCropping && "sm:max-w-lg")}>
          <DialogHeader>
            <DialogTitle>
              {isCropping ? "Crop Photo" : "Profile Photo"}
            </DialogTitle>
          </DialogHeader>

          {isCropping && imageSrc ? (
            /* Cropping Interface */
            <div className="flex flex-col space-y-4">
              {/* Cropper Container */}
              <div className="relative h-72 w-full bg-black rounded-lg overflow-hidden">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              </div>

              {/* Zoom Control */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <ZoomIn className="h-4 w-4" />
                    Zoom
                  </label>
                  <span className="text-sm text-muted-foreground">{Math.round(zoom * 100)}%</span>
                </div>
                <Slider
                  value={[zoom]}
                  onValueChange={(values) => setZoom(values[0])}
                  min={1}
                  max={3}
                  step={0.1}
                  className="w-full"
                />
              </div>

              {/* Rotation Control */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <RotateCw className="h-4 w-4" />
                    Rotation
                  </label>
                  <span className="text-sm text-muted-foreground">{rotation}°</span>
                </div>
                <Slider
                  value={[rotation]}
                  onValueChange={(values) => setRotation(values[0])}
                  min={0}
                  max={360}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Crop Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleCancelCrop}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleCropApply}
                >
                  <Crop className="mr-2 h-4 w-4" />
                  Apply Crop
                </Button>
              </div>
            </div>
          ) : (
            /* Main Dialog Content */
            <div className="flex flex-col items-center py-6 space-y-6">
              {/* Large Preview - Fixed circular container */}
              <div className="relative">
                <div className="h-40 w-40 rounded-full overflow-hidden border-4 border-border shadow-lg bg-muted">
                  {displayImage ? (
                    <img
                      src={displayImage}
                      alt={name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/10">
                      <span className="text-4xl font-semibold text-primary">
                        {getInitials(name)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Preview Badge */}
                {croppedPreview && (
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                    Preview
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col w-full gap-2">
                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {croppedPreview ? (
                  /* Show Save/Cancel when preview is active */
                  <div className="flex gap-2 w-full">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setCroppedPreview(null);
                        setCroppedBlob(null);
                        setImageSrc(null);
                      }}
                      disabled={isUploading}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleUpload}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Save Photo
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  /* Show options */
                  <>
                    {/* Change Profile Photo - Only shown when there's an existing photo */}
                    {currentImage && (
                      <Button
                        className="w-full justify-start h-12"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading || isDeleting}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-primary-foreground/20">
                            <Pencil className="h-4 w-4" />
                          </div>
                          <div className="text-left">
                            <p className="font-medium">Change Profile Photo</p>
                            <p className="text-xs opacity-80">
                              Replace your current photo
                            </p>
                          </div>
                        </div>
                      </Button>
                    )}

                    {/* Choose from Gallery */}
                    <Button
                      variant="outline"
                      className="w-full justify-start h-12"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading || isDeleting}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-primary/10">
                          <ImageIcon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium">
                            {currentImage ? "Choose from Gallery" : "Upload Photo"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            JPG, PNG, GIF, WEBP (max 5MB)
                          </p>
                        </div>
                      </div>
                    </Button>

                    {/* Remove Photo - Only shown when there's an existing photo */}
                    {currentImage && (
                      <Button
                        variant="outline"
                        className="w-full justify-start h-12 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={handleDelete}
                        disabled={isUploading || isDeleting}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-destructive/10">
                            {isDeleting ? (
                              <Loader2 className="h-4 w-4 text-destructive animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-destructive" />
                            )}
                          </div>
                          <div className="text-left">
                            <p className="font-medium">
                              {isDeleting ? "Removing..." : "Remove Photo"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Delete your current profile photo
                            </p>
                          </div>
                        </div>
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
