<!-- STATUS: PLANNED. Not implemented. -->

# AI service

> **Status: PLANNED — not implemented.**

The eventual serving boundary: an internal HTTP/gRPC interface that accepts a
structured financial context and returns generated insight text.

Keeping this behind a service boundary means the application never imports a
model runtime directly, and the model can be replaced, versioned or scaled
without touching application code.
