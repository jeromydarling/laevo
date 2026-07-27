/**
 * The photographs, and the words that stand in for them.
 *
 * Every photograph on this site is an illustration generated with an image
 * model. None of them shows a real pantry, a real volunteer or a real
 * neighbor, and none contains a recognisable face — partly because a stock
 * photograph of somebody's face at a food line is exactly the kind of thing
 * this product exists to argue against, and partly because we would be
 * putting a stranger's face on a page about their worst month.
 *
 * That is disclosed in the footer. A site whose whole voice is "say the true
 * thing plainly" does not get to imply it has documentary photographs of real
 * pantries it has never visited.
 *
 * Alt text is written by hand, describes what is actually in the frame, and
 * never repeats the caption next to it.
 */

export interface Photo {
  /** Base filename in /public/photos. */
  name: string;
  alt: string;
  /** Intrinsic size of the largest variant, so space is reserved before load. */
  width: number;
  height: number;
  /** Available widths, smallest first. */
  widths: [number, number];
}

export const PHOTOS = {
  storeroom: {
    name: "storeroom",
    alt: "A small pantry storeroom in the morning: wooden shelves of tinned vegetables and jars of sauce, sacks of rice stacked on a rack, light coming through a high window.",
    width: 1600,
    height: 907,
    widths: [800, 1600],
  },
  packingHands: {
    name: "packing-hands",
    alt: "Two hands packing a loaf of bread and tins into a brown paper grocery bag on a wooden table.",
    width: 1200,
    height: 900,
    widths: [600, 1200],
  },
  shelf: {
    name: "shelf-detail",
    alt: "A row of plain tin cans and glass preserving jars on a wire shelf, lit from the side.",
    width: 1200,
    height: 900,
    widths: [600, 1200],
  },
  warehouse: {
    name: "warehouse",
    alt: "A food bank warehouse: pallets stacked with boxes and trays of tinned food, tall racking down both sides, a pallet jack parked to one side.",
    width: 1600,
    height: 907,
    widths: [800, 1600],
  },
  produce: {
    name: "produce",
    alt: "Wooden crates of potatoes, onions, carrots and red apples on a trestle table in morning light.",
    width: 1200,
    height: 900,
    widths: [600, 1200],
  },
  handsTablet: {
    name: "hands-tablet",
    alt: "An older person's hands resting either side of a tablet propped on a stand, with a paper notebook and pen open beside it.",
    width: 1200,
    height: 900,
    widths: [600, 1200],
  },
  hall: {
    name: "hall",
    alt: "A community hall set up before a distribution: a long trestle table with packed paper bags, stacks of flat bags and crates of tins, empty chairs along the wall.",
    width: 1600,
    height: 907,
    widths: [800, 1600],
  },
} as const satisfies Record<string, Photo>;

export type PhotoKey = keyof typeof PHOTOS;

export const PHOTO_DISCLOSURE =
  "The photographs on this site are illustrations made with an image model. They are not real pantries, and nobody in them is a real person.";
