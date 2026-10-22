# Process

## Starting idea

I wanted to build a small creative browser experience in which players make a personal pizza through direct actions. The intended player is someone looking for a short visual activity in a browser. I planned a six-step flow: choose a crust, spread sauce, scatter cheese, place toppings, bake, and name and save the result.

The central design goal was for actions to have visible consequences. A brush stroke should appear where the player draws it, and a topping should appear where the player clicks. Instructions and the **Next** button provide feedback about what can happen next.

## Design and code iterations

- **Visual direction:** I gave Codex visual references and guidance for the visual direction. I asked for a comfortable, muted palette and a workbench layout that keeps the pizza and the tools for each step clear. I reviewed the results and asked for adjustments when the colors felt too vivid.
- **Sauce and cheese:** The first version left sparse brush marks, which could make the finished pizza look incomplete. An early automatic fill used a different broad texture, so the result did not match what the player had just drawn. I changed completion to repeat the same small brush stamps used during the player's gesture. I also changed grouped olives to a single-olive asset so each click adds exactly one olive.
- **Sauce alternatives:** Tomato sauce had a detailed texture, while basil pesto and cream sauce looked like flat color strokes. After reviewing real pizza sauce options, I kept both alternatives and made matching texture assets: finely flecked pesto and smoother white sauce. I adjusted the white sauce after a visual check because the first texture looked too much like strands of cheese when repeated across the pizza.
- **Baking time:** The first baking slider changed its number but produced the same final pizza at every setting. I connected the chosen time to the rendered result: a shorter bake blends in more of the pale crust image and leaves the cheese lighter, while a longer bake deepens the crust color and adds more soft toasted spots to the cheese. I checked 6, 8, and 12 minutes in Chrome; the topping positions stayed the same. The downloaded PNG uses this same rendering.

## Human tryout and response

A friend tried the game through the toppings step. They tried returning to the first step after placing toppings and expected to see an empty pizza with only the crust choice available. Instead, earlier work was still present. They also tried to put a mushroom partly over an olive. Their click selected the olive, leaving them unsure how to make an overlapping placement.

I changed navigation back to the first step to clear the pizza, saved progress, and Undo history. I also separated **Place toppings** and **Move & edit**. In place mode, a click always adds the chosen topping at that position, including over another topping; edit mode handles selection and movement. A Codex-assisted browser check confirmed the olive-and-mushroom overlap and the empty first step after returning from toppings. The friend has not yet retested these revisions.

## Error case checked

A Codex-assisted Chrome check covered the first-step case where the player has not chosen a crust. **Next** remained disabled and the feedback said “Choose a crust to continue.” After choosing Classic crust, **Next** became available and the feedback confirmed the choice. This prevents the player from entering the sauce step without a pizza base.

## AI tools and sources

OpenAI ImageGen generated the food images from the briefs in [`references/asset-prompts.md`](references/asset-prompts.md). OpenAI Codex helped create and revise the HTML, CSS, JavaScript, English interface text, documentation, and browser checks. I reviewed the results and requested changes when the colors felt too vivid, when automatic filling did not match the player's marks, and when pesto and cream sauce lacked texture. I adopted the friend's reset and overlap requests and used separate place and edit controls to keep topping adjustment possible.

DM Sans and Fraunces are loaded from Google Fonts. The source code and image assets needed to run the game are included in the repository. Git commits record the earlier implementation stages and revisions.
