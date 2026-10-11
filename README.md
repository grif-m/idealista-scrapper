# Overview
A Node.js API that scrapes Idealista Portugal listing results using Playwright.

# API
## Base URL
The API listens on port 80 by default. Set `PORT` to use a different port.
## Endpoints
- `GET /health` returns current health status
- `POST /scrap` executes scrapper and returns results. It should wait for execution of 
  - Input JSON (body):
    ```json
    {
      "baseUrl": "https://www.idealista.pt/en/multi/comprar-casas/aX2,buZ,bv3/com-tamanho-max_80,apenas-apartamentos,t2/",
      "maxResults": 200
    }
    ```
  - Results:
  ```json
  [
    {
      "price": 385000,
      "currency": "€",
      "priceByArea": 5066,
      "rooms": "T2",
      "area": 76,
      "floor": "2nd floor without lift",
      "description": "Excellent T2+1 apartment, in good condition, currently used as tourist accommodation.The property consists of a 13 m² living room, an 11 m² bedroom with a built-in wardrobe, a second 7.5 m² bedroom with a balcony, a 4.5 m² interior bedroom, a fully equipped kitchen with a pantry, a sunroom, and a bathroom with a show"
    },
    ...
  ]
  ```
`maxResults` is optional (defaults to 200) and must be between 1 and 1000. Requests
must use an HTTPS `idealista.pt` URL. Scraping errors return HTTP 502; invalid input
returns HTTP 400. Idealista may deny automated requests with an access challenge;
such failures are reported in the API process logs.
## Security
No authentication for requests.

# Scrapper
Using playwright open page in `baseUrl` and scrap pages, until `maxResults` is reached using controls on the bottom of web page. All information scrapped is from the list, there is no need to go to details pages.

# Technology Stack
Node.js, Playwright

# Containers
Application should be executed via docker container (using `Dockerfile`).

Example `docker-compose.yml`:
```yaml
services:
  idealista-scrapper:
    build: .
    restart: unless-stopped
```

The included `docker-compose.yml` publishes the API on host port 80. To run it:

```sh
docker compose up --build
```

For local development, install dependencies and the Playwright Chromium browser,
then start the API:

```sh
npm install
npx playwright install chromium
PORT=8080 npm start
```

Run the tests with `npm test`.
