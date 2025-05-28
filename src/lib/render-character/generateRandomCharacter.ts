import characterProperties from "@/const/characterProperties";
import Character from "@/types/Character";

/**
 * Generate a random character for the game
 */
export default function generateRandomCharacter() {
  const character: Character = {};

  // for each key, generate a random number between 0 and the length of the array
  Object.entries(characterProperties).forEach(([key, value]) => {
    if (key !== "base") {
      if (Math.random() > 0.4) {
        return;
      }
    }
    const randomType = Math.floor(Math.random() * value.files.length);
    const randomColor = Math.floor(Math.random() * value.colors.length);

    character[key as keyof typeof characterProperties] = {
      type: randomType,
      color: randomColor,
    };
  });

  return character;
}
