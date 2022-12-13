const express = require("express");
const router = express.Router();
const fs = require("fs");
const _ = require("lodash");

function containsOnlyNumbers(str) {
  return /^\d+$/.test(str);
}

// api to create a new pokemon with specify id
router.post("/", (req, res, next) => {
  try {
    const { id, name, types, url } = req.body;
    if (!id || !name || !url) {
      const exception = new Error(`Missing required data.`);
      exception.statusCode = 401;
      throw exception;
    }

    if (types.length >= 3) {
      const exception = new Error(`Pokemon can only have one or two types.`);
      exception.statusCode = 401;
      throw exception;
    }

    if (!types[0] && !types[1]) {
      const exception = new Error(
        `Missing required data. You must specify type for pokemon.`
      );
      exception.statusCode = 401;
      throw exception;
    }

    const pokemonTypes = [
      "bug",
      "dragon",
      "fairy",
      "fire",
      "ghost",
      "ground",
      "normal",
      "psychic",
      "steel",
      "dark",
      "electric",
      "fighting",
      "flyingText",
      "grass",
      "ice",
      "poison",
      "rock",
      "water",
    ];

    // handle pokemon types
    const pokemonType1 = types[0] || "";
    const pokemonType2 = types[1] || "";

    let newPokemonTypes = new Set(
      [
        _.lowerCase(pokemonType1.trim()),
        _.lowerCase(pokemonType2.trim()),
      ].filter((type) => type !== "")
    );
    newPokemonTypes = Array.from(newPokemonTypes);

    newPokemonTypes.forEach((type) => {
      if (!pokemonTypes.includes(type)) {
        const exception = new Error(`Pokemon's type is invalid.`);
        exception.statusCode = 401;
        throw exception;
      }
    });

    const pokemonId = parseInt(id);
    const pokemonName = _.toLower(name.trim());

    // Read data from pokemons.json then parse to JSobject
    let pokemonDatabase = fs.readFileSync("pokemons.json", "utf-8");
    pokemonDatabase = JSON.parse(pokemonDatabase);
    const { data: pokemons } = pokemonDatabase;

    // check pokemon exists by id or by name
    const targetPokemonIndex = pokemons.findIndex(
      (pokemon) => pokemon.id === pokemonId || pokemon.name === pokemonName
    );

    if (targetPokemonIndex >= 0) {
      const exception = new Error(`The Pokemon already exists.`);
      exception.statusCode = 404;
      throw exception;
    }

    // prepare new pokemon object
    const newPokemon = {
      id: pokemonId,
      name: pokemonName,
      types: newPokemonTypes,
      url,
    };

    // add new pokemon
    pokemons.push(newPokemon);

    // add new pokemon to pokemon database
    pokemonDatabase.data = pokemons;
    pokemonDatabase.totalPokemons = pokemons.length;

    //db JSobject to JSON string
    pokemonDatabase = JSON.stringify(pokemonDatabase);

    //write and save to db.json
    fs.writeFileSync("pokemons.json", pokemonDatabase);

    // post send response
    res.status(200).send(newPokemon);
  } catch (error) {
    next(error);
  }
});

// api to delete pokemon by id
router.delete("/:pokemonId", (req, res, next) => {
  try {
    // get pokemonId parameter
    const { pokemonId } = req.params;

    // Read data from pokemons.json then parse to JSobject
    let pokemonDatabase = fs.readFileSync("pokemons.json", "utf-8");
    pokemonDatabase = JSON.parse(pokemonDatabase);
    const { data: pokemons } = pokemonDatabase;

    //find pokemon by id
    const targetPokemonIndex = pokemons.findIndex(
      (pokemon) => pokemon.id === parseInt(pokemonId)
    );

    if (targetPokemonIndex < 0) {
      const exception = new Error(`Pokemon not found`);
      exception.statusCode = 404;
      throw exception;
    }

    //filter data pokemons object
    const pokemonFiltered = pokemons.filter(
      (pokemon) => pokemon.id !== parseInt(pokemonId)
    );

    pokemonDatabase.data = pokemonFiltered;
    pokemonDatabase.totalPokemons = pokemonFiltered.length;

    //db JSobject to JSON string
    pokemonDatabase = JSON.stringify(pokemonDatabase);

    //write and save to db.json
    fs.writeFileSync("pokemons.json", pokemonDatabase);

    //delete send response
    res.status(200).send({ success: true, message: "Delete successfully" });
  } catch (error) {
    next(error);
  }
});

// api to get pokemon by id
router.get("/:pokemonId", (req, res, next) => {
  try {
    let { pokemonId } = req.params;
    pokemonId = parseInt(pokemonId);

    // Read data from pokemons.json then parse to JSobject
    let pokemonDatabase = fs.readFileSync("pokemons.json", "utf-8");
    pokemonDatabase = JSON.parse(pokemonDatabase);
    const { data: pokemons } = pokemonDatabase;

    // find pokemon by id
    const targetPokemon = pokemons.filter(
      (pokemon) => pokemon.id === pokemonId
    );

    if (!targetPokemon.length) {
      const exception = new Error(`Pokemon Not Found`);
      exception.statusCode = 404;
      throw exception;
    }

    const previousPokemon = pokemons.filter(
      (pokemon) => pokemon.id === pokemonId - 1
    );

    const nextPokemon = pokemons.filter(
      (pokemon) => pokemon.id === pokemonId + 1
    );

    // create response data object
    const responseData = {
      data: {
        pokemon: targetPokemon.length ? targetPokemon[0] : [],
        previousPokemon: previousPokemon.length ? previousPokemon[0] : [],
        nextPokemon: nextPokemon.length ? nextPokemon[0] : [],
      },
    };

    // send response
    res.status(200).send(responseData);
  } catch (error) {
    next(error);
  }
});

// api to get all pokemons (allowed search by type and by name, id)
router.get("/", (req, res, next) => {
  const allowedFilter = ["search", "type", "page", "limit"];

  try {
    let { page, limit, ...filterQuery } = req.query;

    page = parseInt(page) || 1;
    limit = parseInt(limit) || 20;

    const filterKeys = Object.keys(filterQuery);
    filterKeys.forEach((key) => {
      if (!allowedFilter.includes(key)) {
        const exception = new Error(`Query ${key} is not allowed`);
        exception.statusCode = 401;
        throw exception;
      }
      if (!filterQuery[key]) delete filterQuery[key];
    });

    // Number of items skip for selection
    let offset = limit * (page - 1);

    // Read data from pokemons.json then parse to JSobject
    let pokemonDatabase = fs.readFileSync("pokemons.json", "utf-8");
    pokemonDatabase = JSON.parse(pokemonDatabase);
    const { data: pokemons } = pokemonDatabase;

    // Filter by type, name, id
    let result = [];

    if (filterKeys.length) {
      filterKeys.forEach((condition) => {
        let filterValue = _.toLower(filterQuery[condition].trim());

        if (condition === "search") {
          if (containsOnlyNumbers(filterValue)) {
            result = result.length
              ? result.filter(
                  (pokemon) => pokemon["id"] === parseInt(filterValue)
                )
              : pokemons.filter(
                  (pokemon) => pokemon["id"] === parseInt(filterValue)
                );
          } else {
            result = result.length
              ? result.filter((pokemon) =>
                  pokemon["name"].includes(filterValue)
                )
              : pokemons.filter((pokemon) =>
                  pokemon["name"].includes(filterValue)
                );
          }
        } else if (condition === "type") {
          result = result.length
            ? result.filter((pokemon) => pokemon["types"].includes(filterValue))
            : pokemons.filter((pokemon) =>
                pokemon["types"].includes(filterValue)
              );
        } else {
          result = result.length
            ? result.filter((pokemon) => pokemon[condition] === filterValue)
            : pokemons.filter((pokemon) => pokemon[condition] === filterValue);
        }
      });
    } else {
      result = pokemons;
    }

    // select number of result by offset
    result = result.slice(offset, offset + limit);

    // create response data object
    const responseData = {
      data: result,
      totalPokemons: result.length,
    };

    // send response
    res.status(200).send(responseData);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
