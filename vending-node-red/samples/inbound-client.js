var WebSocketClient = require('websocket').client;

var client = new WebSocketClient();

client.on('connectFailed', function(error) {
    console.log('Connect Error: ' + error.toString());
});

client.on('connect', function(connection) {
    console.log('WebSocket Client Connected');
    connection.on('error', function(error) {
        console.log("Connection Error: " + error.toString());
    });
    connection.on('close', function() {
        console.log('echo-protocol Connection Closed');
    });
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            console.log("Received: '" + message.utf8Data + "'");
        }
    });

    function sendNumber() {
        if (connection.connected) {

            connection.sendUTF(JSON.stringify({
              "messageId": new Date().toString(),
              "body":[
                {
                   "name": "Compressor-2015:Temperature",
                   "datapoints":[
                     [+ new Date(), 176.877969, 3],
                     [+ new Date() + 1, 177.877969, 3],
                     [+ new Date() + 2, 100, 3],
                     [+ new Date() + 3, 172.877969, 3]
                   ]
                }
              ]
            }));

            setTimeout(sendNumber, 10000);
        }
    }
    sendNumber();
});

client.connect(
  'ws://localhost:1880/hello',
  null,
  null,
  {
    //Authorization: 'Bearer eyJhbGciOiJSUzI1NiJ9.eyJqdGkiOiJhMTgzMmRiMC02MDZjLTQ5Y2MtYTZhMi03YjA1NDhmYzNhN2IiLCJzdWIiOiIxMmQzY2QwZi0xZWI0LTRjY2YtYWRiZi0wZjdhNDZhZmRjYmQiLCJzY29wZSI6WyJvcGVuaWQiLCJwcmVkaXgtYXNzZXQuem9uZXMuNWZhYzRmMDctMTEwNy00MWFlLWJlNzAtYjc5NWRkOTQ1YTIwLnVzZXIiLCJhY3MucG9saWNpZXMucmVhZCIsInRpbWVzZXJpZXMuem9uZXMuZDVlMmRjYjYtYjI0Yy00ZjgzLTliMjUtMDMzYmFkYTNhYTkzLnF1ZXJ5IiwiYWNzLmF0dHJpYnV0ZXMucmVhZCIsInRpbWVzZXJpZXMuem9uZXMuZDVlMmRjYjYtYjI0Yy00ZjgzLTliMjUtMDMzYmFkYTNhYTkzLmluZ2VzdCIsInRpbWVzZXJpZXMuem9uZXMuZDVlMmRjYjYtYjI0Yy00ZjgzLTliMjUtMDMzYmFkYTNhYTkzLnVzZXIiXSwiY2xpZW50X2lkIjoibXZwM19yZWZfYXBwIiwiY2lkIjoibXZwM19yZWZfYXBwIiwiYXpwIjoibXZwM19yZWZfYXBwIiwiZ3JhbnRfdHlwZSI6InBhc3N3b3JkIiwidXNlcl9pZCI6IjEyZDNjZDBmLTFlYjQtNGNjZi1hZGJmLTBmN2E0NmFmZGNiZCIsIm9yaWdpbiI6InVhYSIsInVzZXJfbmFtZSI6InJtZF91c2VyXzEiLCJlbWFpbCI6InJtZF91c2VyXzFAZ2VncmN0ZXN0LmdlLmNvbSIsImF1dGhfdGltZSI6MTQ1NTQ4NDk1OCwicmV2X3NpZyI6ImQyMGVlMDk1IiwiaWF0IjoxNDU1NDg0OTU4LCJleHAiOjE0NTU1MjgxNTgsImlzcyI6Imh0dHBzOi8vOGJhM2I2ZTMtNzEyZi00ZGU1LWI2Y2QtMjQ4ZTZiMzcwNTA3LnByZWRpeC11YWEucnVuLmF3cy11c3cwMi1wci5pY2UucHJlZGl4LmlvL29hdXRoL3Rva2VuIiwiemlkIjoiOGJhM2I2ZTMtNzEyZi00ZGU1LWI2Y2QtMjQ4ZTZiMzcwNTA3IiwiYXVkIjpbIm12cDNfcmVmX2FwcCIsIm9wZW5pZCIsInByZWRpeC1hc3NldC56b25lcy41ZmFjNGYwNy0xMTA3LTQxYWUtYmU3MC1iNzk1ZGQ5NDVhMjAiLCJhY3MucG9saWNpZXMiLCJ0aW1lc2VyaWVzLnpvbmVzLmQ1ZTJkY2I2LWIyNGMtNGY4My05YjI1LTAzM2JhZGEzYWE5MyIsImFjcy5hdHRyaWJ1dGVzIl19.CFqBGDi9N6bA3cEHBG4hbjfNWRG16N_NFkAbyEmFPk4yI6ybxLOlOT2CVRHeJ-iWp4_RNkslKl0UNco852Kkrex_nP-QJnWi5BlWtw9y9k8S7tBYU7S1wTUvaU8Ieizg516UEJFy1SPgdADamzpM8B4yGBBQfzX4hSReHtKzPRbjB8vQ4u4S4WztCuGkHHjfhjVVLG_cclrPdoL53wCtUJ6udIbGty5FFoPh9u43GMuwPZ4rB9u_BLLLmArnlG_iKAdWLxOwbea0dqaNEJKVKHKRHaQku9pPjgo-PF1q5_SIH7hRU5qWU_mGptJeXQCvAM60bPOG4BMsstXGArMLng',
    Origin: 'http://localhost',
    'Predix-Zone-Id': 'd5e2dcb6-b24c-4f83-9b25-033bada3aa93'
  }
);
