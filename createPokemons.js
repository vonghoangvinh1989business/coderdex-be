const fs = require("fs");
const csv = require("csvtojson");
require("dotenv").config();
const _ = require("lodash");

let id = 0;
const DOMAIN_NAME = process.env.DOMAIN_NAME;
const PROTOCOL = process.env.PROTOCOL;
const PORT = process.env.PORT;

const createPokemonData = async () => {
  console.log("---start generating pokemon data---");
  console.log("-----------------------------------");
  let pokemonNewData = await csv().fromFile("pokemons.csv");

  pokemonNewData = pokemonNewData
    .map((pokemon) => {
      // create id for each pokemon
      id++;

      const pokemonObject = {
        id,
        name: _.lowerCase(pokemon.Name),
        types: [_.lowerCase(pokemon.Type1), _.lowerCase(pokemon.Type2)].filter(
          (type) => type
        ),
        url: `${PROTOCOL}://${DOMAIN_NAME}:${PORT}/images/${id}.png`,
      };
      return pokemonObject;
    })
    .filter((pokemon) => fs.existsSync(`./public/images/${pokemon.id}.png`));

  let pokemonData = JSON.parse(fs.readFileSync("pokemons.json"));
  pokemonData.data = pokemonNewData;
  pokemonData["totalPokemons"] = pokemonNewData.length;

  fs.writeFileSync("pokemons.json", JSON.stringify(pokemonData));
  console.log("-----------------------------------");
  console.log("----------processing done----------");
};

// testing
createPokemonData();
