const express = require('express');
const path = require('path');
const app = express();
const port = 5050;
app.use(express.json());

let products = [
  {
    id: 1,
    nom: 'BMW Série 1',
    description: 'Compacte 5 portes, 118i 136 ch',
    prix: 34900,
    categorie: 'Compacte'
  },
  {
    id: 2,
    nom: 'BMW Série 3',
    description: 'Berline 320d 190 ch, boîte automatique',
    prix: 49900,
    categorie: 'Berline'
  },
  {
    id: 3,
    nom: 'BMW X3',
    description: 'SUV familial xDrive20d 197 ch',
    prix: 62500,
    categorie: 'SUV'
  },
  {
    id: 4,
    nom: 'BMW X5',
    description: 'Grand SUV xDrive50e hybride rechargeable',
    prix: 99900,
    categorie: 'SUV'
  },
  {
    id: 5,
    nom: 'BMW M4 Competition',
    description: 'Coupé sportif 6 cylindres, 530 ch',
    prix: 105000,
    categorie: 'Sportive'
  }
];
let nextId = 6;

// Vérifie les champs d'un produit. partial = true pour PATCH (champs optionnels)
function validateProduct(body, partial = false) {
  const errors = [];
  const { nom, description, prix, categorie } = body || {};
  if (!partial || nom !== undefined) {
    if (typeof nom !== 'string' || nom.trim() === '') errors.push('nom est requis (texte)');
  }
  if (!partial || description !== undefined) {
    if (typeof description !== 'string') errors.push('description est requise (texte)');
  }
  if (!partial || prix !== undefined) {
    if (typeof prix !== 'number' || prix < 0) errors.push('prix est requis (nombre positif)');
  }
  if (!partial || categorie !== undefined) {
    if (typeof categorie !== 'string' || categorie.trim() === '') errors.push('categorie est requise (texte)');
  }
  return errors;
}

// Page HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Lister
app.get('/products', (req, res) => {
  res.status(200).json(products);
});

// Consulter
app.get('/products/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const product = products.find(p => p.id === id);
  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }
  res.status(200).json(product);
});

// Ajouter
app.post('/products', (req, res) => {
  const errors = validateProduct(req.body);
  if (errors.length) {
    return res.status(400).json({ message: 'Invalid data', errors });
  }
  const { nom, description, prix, categorie } = req.body;
  const newProduct = { id: nextId++, nom, description, prix, categorie };
  products.push(newProduct);
  res.status(201).json(newProduct);
});

// Remplacer
app.put('/products/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const productIndex = products.findIndex(p => p.id === id);
  if (productIndex === -1) {
    return res.status(404).json({ message: 'Product not found' });
  }
  const errors = validateProduct(req.body);
  if (errors.length) {
    return res.status(400).json({ message: 'Invalid data', errors });
  }
  const { nom, description, prix, categorie } = req.body;
  products[productIndex] = { id, nom, description, prix, categorie };
  res.status(200).json(products[productIndex]);
});

// Modifier
app.patch('/products/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const product = products.find(p => p.id === id);
  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }
  const errors = validateProduct(req.body, true);
  if (errors.length) {
    return res.status(400).json({ message: 'Invalid data', errors });
  }
  const { nom, description, prix, categorie } = req.body;
  if (nom !== undefined) product.nom = nom;
  if (description !== undefined) product.description = description;
  if (prix !== undefined) product.prix = prix;
  if (categorie !== undefined) product.categorie = categorie;
  res.status(200).json(product);
});

// Supprimer
app.delete('/products/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const productIndex = products.findIndex(p => p.id === id);
  if (productIndex === -1) {
    return res.status(404).json({ message: 'Product not found' });
  }
  products.splice(productIndex, 1);
  res.status(204).send();
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
