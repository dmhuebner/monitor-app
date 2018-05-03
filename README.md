# Monitor API

### Up/Down monitoring API built with Node

##### Local Development

You will need an SSL cert and key in the https directory to run the https server successfully. 

You can generate a self-signed SSL cert with openssl for development.

```
openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout key.pem -out cert.pem
```