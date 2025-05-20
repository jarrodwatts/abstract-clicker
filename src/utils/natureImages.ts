const TILE_SIZE = 16;
const TREE_TILE_SIZE = 32;

// Nature elements categories
export enum NatureCategory {
  TREES = "trees",
  TREE_LEAVES = "tree_leaves",
  NUTS = "nuts",
  SHRUBS = "shrubs",
  FLOWERS = "flowers",
  MUSHROOMS = "mushrooms",
  MINERALS = "minerals",
  GEMS = "gems",
  INSECTS = "insects",
  BUTTERFLIES = "butterflies",
}

// Mapping of nature elements to their positions in the sprite sheet
export const natureTiles = {
  [NatureCategory.TREES]: [
    "Apple Tree",
    "Orange Tree",
    "Birch Tree",
    "Pine Tree",
    "Plum Tree",
    "Pear Tree",
    "Dragon Tree",
    "Cherry Blossom Tree",
    "Cursed Tree",
    "Dead Oak Tree",
  ],
  [NatureCategory.TREE_LEAVES]: [
    "Apple Tree Leaf",
    "Orange Tree Leaf",
    "Birch Tree Leaf",
    "Pine Tree Leaf",
    "Plum Tree Leaf",
    "Pear Tree Leaf",
    "Dragon Tree Leaf",
    "Autumn Leaf 1",
    "Autumn Leaf 2",
    "Autumn Leaf 3",
  ],
  [NatureCategory.NUTS]: [
    "Hazelnut",
    "Walnut",
    "Almond",
    "Cashew",
    "Macadamia",
    "Peanut",
    "Pecan nut",
    "Brazil nut",
    "Pistachio",
    "Pine nut",
  ],
  [NatureCategory.SHRUBS]: [
    "Raspberry",
    "Winter Creeper",
    "Hydrangea",
    "Persian Shield",
    "Juniper Blue Star",
    "Dwarf Norway Spruce",
    "Daphne Odora",
    "Dog Wood",
    "Camelia",
    "Azalea",
  ],
  [NatureCategory.FLOWERS]: [
    "Common Hedgenettle",
    "Dandelion",
    "Common Knapweed",
    "Poppy",
    "Chamomile",
    "Purple Foxglove",
    "Musk Mallow",
    "Tansy",
    "Crying Heart",
    "Crested Dog Tail",
  ],
  [NatureCategory.MUSHROOMS]: [
    "White Button Mushroom",
    "Cremini",
    "Shitake",
    "King Oyster",
    "Enoki",
    "Beech",
    "Black Trumpet",
    "Chanterelle",
    "Morel",
    "Death Cap",
  ],
  [NatureCategory.MINERALS]: [
    "Chalk",
    "Mudstone",
    "Gold",
    "Silver",
    "Copper",
    "Diabase",
    "Soapstone",
    "Obsidian",
    "Pumice",
    "Scoria",
  ],
  [NatureCategory.GEMS]: [
    "Rose Quartz",
    "Jasper",
    "Citrine",
    "Turquoise",
    "Tiger Eye",
    "Amethyst",
    "Moonstone",
    "Sapphire",
    "Quartz",
    "Bloodstone",
  ],
  [NatureCategory.INSECTS]: [
    "Lady Bug",
    "Bee",
    "Cross Orbweaver Spider",
    "Roly Poly",
    "Grass Hopper",
    "Luna Moth",
    "Death Head Hawk Moth",
    "Dragonfly",
    "Cock Roach",
    "Earth Worm",
  ],
  [NatureCategory.BUTTERFLIES]: [
    "Monarch",
    "Peacock",
    "Zebra Swallowhead",
    "Red Admiral",
    "Morpho",
    "Julia",
    "Parides Montezuma",
    "Orange Daggerwing",
    "Carolina Satyr",
    "Mourning Cloak",
  ],
};

/**
 * Gets the sprite sheet position for a nature element
 * @param category The category of the nature element
 * @param index The index of the element within its category
 * @returns The position and size of the element in the sprite sheet
 */
export function getNatureTilePosition(category: NatureCategory, index: number) {
  if (index < 0 || index >= natureTiles[category].length) {
    throw new Error(`Invalid index ${index} for category ${category}`);
  }

  const isTree = category === NatureCategory.TREES;
  const tileSize = isTree ? TREE_TILE_SIZE : TILE_SIZE;

  // Trees are 32x32 with 5 per row, other categories are 16x16 with 10 per row
  const itemsPerRow = isTree ? 5 : 10;

  let x, y;

  if (isTree) {
    // Trees are in the first two rows (32px height each)
    const treeRow = Math.floor(index / itemsPerRow);
    const treeCol = index % itemsPerRow;
    x = treeCol * TREE_TILE_SIZE;
    y = treeRow * TREE_TILE_SIZE;
  } else {
    // Other categories start after the tree rows (at y=64px)
    // Get the category's position in the enum, excluding TREES (which is first)
    const categoryIndex = Object.values(NatureCategory).indexOf(category) - 1;
    const itemRow = Math.floor(index / itemsPerRow);
    const itemCol = index % itemsPerRow;

    x = itemCol * TILE_SIZE;
    // Add a 1px adjustment to prevent overlap with items above
    // Start at 64px (after trees) + category offset + item's row within category
    y = 64 + categoryIndex * TILE_SIZE + itemRow * TILE_SIZE;
  }

  return {
    x,
    y,
    width: tileSize,
    height: tileSize,
    name: natureTiles[category][index],
  };
}

/**
 * Gets the sprite sheet position for a nature element by name
 * @param name The name of the nature element
 * @returns The position and size of the element in the sprite sheet
 */
export function getNatureTileByName(name: string) {
  for (const category of Object.values(NatureCategory)) {
    const index = natureTiles[category].findIndex((item) => item === name);
    if (index !== -1) {
      return getNatureTilePosition(category, index);
    }
  }
  throw new Error(`Nature element "${name}" not found`);
}

/**
 * Draws a nature tile on a canvas
 * @param ctx Canvas rendering context
 * @param natureTile The nature tile to draw
 * @param x X position on the canvas
 * @param y Y position on the canvas
 * @param width Width on the canvas (defaults to tile's original size)
 * @param height Height on the canvas (defaults to tile's original size)
 */
export function drawNatureTile(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  natureTile: ReturnType<typeof getNatureTilePosition>,
  x: number,
  y: number,
  width: number = natureTile.width,
  height: number = natureTile.height
) {
  // Skip the first pixel row to avoid showing pixels from the item above
  ctx.drawImage(
    image,
    natureTile.x,
    natureTile.y + 1, // Add 1px to y-coordinate to skip the top row
    natureTile.width,
    natureTile.height - 1, // Reduce height by 1px to maintain proportions
    x,
    y,
    width,
    height
  );
}

/**
 * Loads the nature tiles sprite sheet
 * @returns A promise that resolves to the loaded image
 */
export function loadNatureTilesImage(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = "/nature-tiles.png";
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("Failed to load nature tiles image"));
  });
}

// Cached nature tiles image
let cachedImage: HTMLImageElement | null = null;

// Implementation
export async function renderNatureTile(
  ctx: CanvasRenderingContext2D,
  name: NatureTileName,
  x: number,
  y: number,
  width?: number,
  height?: number
): Promise<void> {
  // Load the image if not cached
  if (!cachedImage) {
    cachedImage = await loadNatureTilesImage();
  }

  // Find the tile info by name
  const tileInfo = getNatureTileByName(name);

  // Draw the tile
  drawNatureTile(ctx, cachedImage, tileInfo, x, y, width, height);
}

// Create a type for all valid tile names
export type NatureTileName =
  | "Apple Tree"
  | "Orange Tree"
  | "Birch Tree"
  | "Pine Tree"
  | "Plum Tree"
  | "Pear Tree"
  | "Dragon Tree"
  | "Cherry Blossom Tree"
  | "Cursed Tree"
  | "Dead Oak Tree"
  | "Apple Tree Leaf"
  | "Orange Tree Leaf"
  | "Birch Tree Leaf"
  | "Pine Tree Leaf"
  | "Plum Tree Leaf"
  | "Pear Tree Leaf"
  | "Dragon Tree Leaf"
  | "Autumn Leaf 1"
  | "Autumn Leaf 2"
  | "Autumn Leaf 3"
  | "Hazelnut"
  | "Walnut"
  | "Almond"
  | "Cashew"
  | "Macadamia"
  | "Peanut"
  | "Pecan nut"
  | "Brazil nut"
  | "Pistachio"
  | "Pine nut"
  | "Raspberry"
  | "Winter Creeper"
  | "Hydrangea"
  | "Persian Shield"
  | "Juniper Blue Star"
  | "Dwarf Norway Spruce"
  | "Daphne Odora"
  | "Dog Wood"
  | "Camelia"
  | "Azalea"
  | "Common Hedgenettle"
  | "Dandelion"
  | "Common Knapweed"
  | "Poppy"
  | "Chamomile"
  | "Purple Foxglove"
  | "Musk Mallow"
  | "Tansy"
  | "Crying Heart"
  | "Crested Dog Tail"
  | "White Button Mushroom"
  | "Cremini"
  | "Shitake"
  | "King Oyster"
  | "Enoki"
  | "Beech"
  | "Black Trumpet"
  | "Chanterelle"
  | "Morel"
  | "Death Cap"
  | "Chalk"
  | "Mudstone"
  | "Gold"
  | "Silver"
  | "Copper"
  | "Diabase"
  | "Soapstone"
  | "Obsidian"
  | "Pumice"
  | "Scoria"
  | "Rose Quartz"
  | "Jasper"
  | "Citrine"
  | "Turquoise"
  | "Tiger Eye"
  | "Amethyst"
  | "Moonstone"
  | "Sapphire"
  | "Quartz"
  | "Bloodstone"
  | "Lady Bug"
  | "Bee"
  | "Cross Orbweaver Spider"
  | "Roly Poly"
  | "Grass Hopper"
  | "Luna Moth"
  | "Death Head Hawk Moth"
  | "Dragonfly"
  | "Cock Roach"
  | "Earth Worm"
  | "Monarch"
  | "Peacock"
  | "Zebra Swallowhead"
  | "Red Admiral"
  | "Morpho"
  | "Julia"
  | "Parides Montezuma"
  | "Orange Daggerwing"
  | "Carolina Satyr"
  | "Mourning Cloak";
