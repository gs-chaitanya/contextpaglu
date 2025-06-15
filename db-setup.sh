docker pull couchdb

docker run -d \
  --name couchdb \
  -e COUCHDB_USER=admin \
  -e COUCHDB_PASSWORD=admin123 \
  -p 5984:5984 \
  -v couchdb-data:/opt/couchdb/data \
  couchdb

curl -X PUT http://admin:admin123@localhost:5984/session_db \
     -H "Content-Type: application/json" \

curl -X PUT http://admin:admin123@localhost:5984/personal_context_db \
     -H "Content-Type: application/json" \

curl -X POST http://admin:admin123@localhost:5984/personal_context_db \
  -H "Content-Type: application/json" \
  -d '{
    "_id": "1",
    "name": "",
    "age": "",
    "city": "",
     "country": "",
     "occupation": "",
     "bio":"",
     "context:""
  }'

curl -X PUT http://admin:admin123@localhost:5984/chat_db \
     -H "Content-Type: application/json" \
     -d '{"partitioned": true}'

./db-stop.sh
