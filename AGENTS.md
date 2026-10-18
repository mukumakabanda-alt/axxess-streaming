# Architecture
- Console rentals use a dedicated lightweight content route linked from the hero and footer, keeping streaming as the homepage's primary offer.
- Hero decoration is progressive enhancement: render content immediately, skip WebGL for reduced motion/data-saving connections, and suspend animation work offscreen.