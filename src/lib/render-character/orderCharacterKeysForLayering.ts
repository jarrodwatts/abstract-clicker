// Accepts an array of characterProperty keys

import characterProperties from "@/const/characterProperties";

// Re-orders them to be the correct order
// The correct order is
// 1. base
// 2. eyes
// 3. blush
// 4. lipstick
// 5. upper
// 6. lower
// 7. bodysuit
// 8. shoes
// 9. hair
// 10. beard
// 11. glasses
// 12. earring
// 13. hat
// 14. mask
export default function orderCharacterKeysForLayering(
  keys: Array<keyof typeof characterProperties>
) {
  // Return the keys in the correct order
  return keys.sort((a, b) => {
    return (
      // Lowest layerIndex should be first
      characterProperties[a].layerIndex - characterProperties[b].layerIndex
    );
  });
}
