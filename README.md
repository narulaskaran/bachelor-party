# The Big Send

A trip site for a bachelor party: schedule, lodging, RSVP, all behind a
password only your crew has. One deploy hosts as many trips as you want.
This repo doesn't ship anyone's real itinerary.

Live: [bachelor-party-eight.vercel.app](https://bachelor-party-eight.vercel.app)

## Host

Open the [site](https://bachelor-party-eight.vercel.app), hit **Create a trip**,
and save the organizer packet — invite URL, guest password, admin token. The
token is shown once. That's the only way to edit the trip later.

## Guest

Open the invite, enter the password, RSVP.

## Try it

[/demo](https://bachelor-party-eight.vercel.app/demo) is Alpine Weekend. No
password.

## Agents and the API

OpenAPI, the `bigsend` CLI, and MCP live in [docs/api.md](docs/api.md).
