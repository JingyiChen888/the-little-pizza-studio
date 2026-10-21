# The Little Pizza Studio

A browser game for making a pizza, one step at a time. Choose a crust, spread sauce and cheese, place toppings, bake, then name your creation and download a PNG.

## Run locally

From this directory, run:

```sh
python3 -m http.server 8000 --directory dist
```

Then open <http://localhost:8000>. No installation or account is required.

## How to play

1. Choose a classic, thin, or whole wheat crust.
2. Select a sauce, then press and drag on the pizza to spread it.
3. Press and drag to scatter cheese.
4. Choose a topping and click the pizza to place it. Select a placed topping to resize, rotate, or remove it; drag it to reposition.
5. Choose a baking time and select **Start baking**.
6. Name your pizza and download its PNG image.

Sauce and cheese respond to each brush gesture during their steps. When the player moves on, each layer fills out to give the finished pizza a generous, appetizing look. Toppings always stay exactly where the player placed them.

The player advances with **Next**. **Back**, **Undo**, and **Start over** are available for changes. Progress is saved in the current browser's local storage. Baking time is a visual game choice, so no real-time wait is required.

## Files

- `dist/`: the playable site and image assets.
- `references/`: visual direction and asset notes.

The crust, sauce and cheese textures, and topping artwork were generated with OpenAI ImageGen. Topping buttons and the pizza use the same image atlas, so a topping keeps its appearance when placed.
