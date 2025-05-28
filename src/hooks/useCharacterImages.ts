import { useState, useEffect } from "react";
import Character from "@/types/Character";
import characterProperties from "@/const/characterProperties";

/**
 * Custom hook to handle loading character images for animations
 */
export function useCharacterImages(
  character: Character,
  action: string,
  getFilePathForLayer: (layer: keyof typeof characterProperties) => string,
  getToolFilePath?: () => string
) {
  const [layerImages, setLayerImages] = useState<
    Record<string, HTMLImageElement>
  >({});
  const [toolImage, setToolImage] = useState<HTMLImageElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Reset state when character or action changes
  useEffect(() => {
    setLayerImages({});
    setToolImage(null);
    setIsLoading(true);
  }, [character, action]);

  // Load tool image separately
  useEffect(() => {
    if (!getToolFilePath) {
      setToolImage(null);
      return;
    }

    const loadToolImage = async () => {
      const src = getToolFilePath();

      if (!src) {
        setToolImage(null);
        return;
      }

      const image = new Image();
      return new Promise<void>((resolve) => {
        image.src = src;
        image.onload = () => {
          setToolImage(image);
          resolve();
        };
        image.onerror = () => {
          setToolImage(null);
          resolve();
        };
      });
    };

    loadToolImage();
  }, [getToolFilePath]);

  // Load all images for the character layers
  useEffect(() => {
    const loadImages = async () => {
      // Get character keys that have values, ordered by layer index
      const characterKeys = Object.keys(character)
        .filter((key) => character[key as keyof Character] !== undefined)
        .sort((a, b) => {
          const keyA = a as keyof typeof characterProperties;
          const keyB = b as keyof typeof characterProperties;
          return (
            characterProperties[keyA].layerIndex -
            characterProperties[keyB].layerIndex
          );
        }) as Array<keyof typeof characterProperties>;

      // Load images in parallel
      const imagePromises = characterKeys.map((key) => {
        return new Promise<{ key: string; image: HTMLImageElement }>(
          (resolve) => {
            const image = new Image();
            const src = getFilePathForLayer(key);
            if (!src) {
              return resolve({ key: key as string, image: new Image() });
            }

            image.src = src;
            image.onload = () => resolve({ key: key as string, image });
            image.onerror = () =>
              resolve({ key: key as string, image: new Image() });
          }
        );
      });

      // Wait for all images to load
      const results = await Promise.all(imagePromises);

      // Create new images object
      const newImages = results.reduce<Record<string, HTMLImageElement>>(
        (acc, { key, image }) => {
          if (image.complete && image.src) acc[key] = image;
          return acc;
        },
        {}
      );

      setLayerImages(newImages);
      setIsLoading(false);
    };

    loadImages();
  }, [character, action, getFilePathForLayer]);

  return { layerImages, toolImage, isLoading };
}
