var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;

router.get("/countries", function (req, res, next) {
  req.db
    .from("data")
    .select("country")
    .then((rows) => {
      const countriesSet = new Set(rows.map(row => row.country));
      const uniqueCountries = Array.from(countriesSet).sort();
      res.json(uniqueCountries);
    })
    .catch((err) => {
      console.log(err);
      res.json({ Error: true, Message: "Error in MySQL query" });
    });
});

router.get("/volcanoes", function(req, res, next) {
  const country = req.query.country;
  const populatedWithin = req.query.populatedWithin;

  if (!country) {
    return res.status(400).json({ error: true, message: "Country is required" });
  }

  let query = req.db.from("data").select("id", "name", "country", "region", "subregion").where("country", country);

  if (populatedWithin) {
    // Assuming the population fields are in the database
    const populationColumn = `population_${populatedWithin}`;
    query = query.where(populationColumn, ">", 0);
  }

  query
    .then((rows) => {
      res.json(rows);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: true, message: "Error in MySQL query" });
    });
});

router.get("/volcanoes/:country/:{id}}", function (req, res, next) {
  const { country, populatedWithin } = req.params;

  let query = req.db.from("data").select("id", "name", "country", "region", "subregion");

  query = query.where("country", country);

  if (populatedWithin) {
    // Assuming the population fields are in the database
    const populationColumn = `population_${populatedWithin}`;
    query = query.where(populationColumn, ">", 0);
  }

  query
    .then((rows) => {
      res.json(rows);
    })
    .catch((err) => {
      console.log(err);
      res.json({ Error: true, Message: "Error in MySQL query" });
    });
});

router.get('/me', function(req, res, next) {
  const userProfile = {
    name: "Hajun Song",
    student_number: "n9894403"
  };

  res.status(200).json(userProfile);
});
