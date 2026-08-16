# The Big Send

A trip site for a bachelor party: schedule, lodging, RSVP, all behind a
password only your crew has. One deploy hosts as many trips as you want.
This repo doesn't ship anyone's real itinerary.

Live: [party.narula.xyz](https://party.narula.xyz)

## Host

Open the [site](https://party.narula.xyz), hit **I'm hosting**,
and save the organizer packet — invite URL, guest password, host key. The
host key is shown once. Keep it for the API; there isn't an in-product editor yet.

## Guest

Open the invite (or **I have an invite** on the homepage), enter the password, RSVP.

## Try it

[/demo](https://party.narula.xyz/demo) is Alpine Weekend. No
password.

## Agents and the API

OpenAPI, the `bigsend` CLI, and MCP live in [docs/api.md](docs/api.md).
