docker pull couchdb

docker run -d \
  --name couchdb \
  -e COUCHDB_USER=admin \
  -e COUCHDB_PASSWORD=admin123 \
  -p 5984:5984 \
  -v couchdb-data:/opt/couchdb/data \
  couchdb

curl -X PUT http://admin:password@localhost:5984/sessionDB \
     -H "Content-Type: application/json" \

curl -X PUT http://admin:password@localhost:5984/contextDB \
     -H "Content-Type: application/json" \

curl -X PUT http://admin:password@localhost:5984/chatDB \
     -H "Content-Type: application/json" \
     -d '{"partitioned": true}'

docker stop couchdb