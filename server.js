require('dotenv').config();
const express = require('express');
const app = express();
const pg = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');
const superagent = require('superagent');

const PORT = process.env.PORT;
const G_API_KEY = process.env.G_API_KEY;
console.log(G_API_KEY);
const client = new pg.Client(process.env.DATABASE_URL);
client.connect();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use((req, res, next) => {
    console.log('received a request!!');
    next();
});

app.get('/randomQuote', (req, res) => {
    superagent.get('http://quotes.stormconsultancy.co.uk/random.json')
        .end((err,resp) => {
            res.send(resp.body.quote);
        });
});

// /books/search?search=tree
app.get('/search', (req, res) => {
// https://www.googleapis.com/books/v1/volumes?q=intitle:monkeys&key=SECRETKEY
    const googleUrl = 'https://www.googleapis.com/books/v1/volumes?q=';
    const searchFor = req.query.search;

    console.log('req.params', req.params);
    console.log('req.query', req.query);

    superagent
        .get(`${googleUrl}${searchFor}&key=${G_API_KEY}`)
        .end((err, resp) => {
            // console.log('data from books', data);
            /*
                resp.body = the response obj from google's server
                resp.body.items = an array of books

                TODO
                Array.slice() to shorten our array
                Array.map() our shortened array to go through each book and 
                    shrink it to the data we want

                GOAL:
                    send back an array of objects that looks like
                    a client GET req to /api/v1/cards
            */

            const smallBooks = resp.body.items.slice(0,10).map( book => {
                return {
                    title: book.volumeInfo.title,
                    description: book.volumeInfo.description,
                    author: book.volumeInfo.authors[0],
                    isbn: book.volumeInfo.industryIdentifiers[0].identifier,
                    image_url: book.volumeInfo.imageLinks.thumbnail 
                };
            });

            res.send(smallBooks);
        });
});

app.get('/api/v1/cards', (req, res) => {
    client.query(`SELECT * FROM cards;`)
        .then(data => res.send(data.rows))
        .catch(console.error);
});

app.post('/api/v1/cards', (req, res) => {
    console.log('---------------------------------------');
    console.log(req.body);
    client.query(`
        INSERT INTO cards (recipient, sender, content)
        VALUES ($1, $2, $3);
        `, [
            req.body.recipient,
            req.body.sender,
            req.body.content
        ])
        .then(data => res.status(201).send(data.rows))
        .catch(console.error);
});

app.get('/api/v1/cards/:id', (req, res) => {
    client.query(`SELECT * FROM cards WHERE id = $1`, [req.params.id])
        .then(data => res.send(data.rows))
        .catch(console.error);
});

app.put('/api/v1/cards/:id', (req, res) => {
    client.query(`
        UPDATE cards SET recipient=$1, sender=$2, content=$3
        WHERE id=$4;
        `, [
            req.body.recipient,
            req.body.sender,
            req.body.content,
            req.params.id
        ])
        .then(data => res.status(200).send('Card updated'))
        .catch(console.error);
});

app.delete('/api/v1/cards/:id', (req, res) => {
    client.query(`
        DELETE FROM cards WHERE id = $1;
        `, [req.params.id])
        .then(data => res.send('Data deleted.').status(204))
        .catch(console.error);
});


app.get('/api/v1/cards/:recipient', (req, res) => {
    client.query(
        `SELECT * FROM cards WHERE recipient = $1;`,
        [   
            req.params.recipient
        ])
        .then(data => res.send(data.rows))
        .catch(console.error);
});

app.listen(PORT, () => {
    console.log(`Listening for API requests to port ${PORT}`);
});