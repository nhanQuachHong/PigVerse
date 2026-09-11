export const GENESIS_MIN_TOKEN_ID = 1;
export const GENESIS_MAX_TOKEN_ID = 10;
export const GENESIS_MAX_SUPPLY = 10;

export const GENESIS_TOKEN_IDS = Object.freeze(
  Array.from(
    { length: GENESIS_MAX_SUPPLY },
    (_, index) => GENESIS_MIN_TOKEN_ID + index,
  ),
);
