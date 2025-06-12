docker run -d \
  --name couchdb \
  -e COUCHDB_USER=admin \
  -e COUCHDB_PASSWORD=admin123 \
  -p 5984:5984 \
  -v couchdb-data:/opt/couchdb/data \
  couchdb