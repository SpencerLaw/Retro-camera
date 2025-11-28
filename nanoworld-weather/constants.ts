export const DEFAULT_CITY = "Beijing";

// The mapping logic is handled by the Text AI to ensure flexibility,
// but we define the strict mapping rules here for the System Instruction.
export const WEATHER_MAPPING_RULES = `
Strictly map the current weather condition to these visual descriptions:
- Clear / Sunny -> "cute smiling sun + thin cotton clouds"
- Partly cloudy -> "half sun half fluffy white clouds"
- Cloudy / Overcast -> "thick grey-white marshmallow clouds"
- Rain -> "soft cute raindrops falling from cotton clouds"
- Snow -> "soft fluffy snowflakes + snowman elements"
- Thunderstorm -> "tiny lightning bolts + dark cotton clouds"
- Fog / Mist -> "hazy cream-colored mist"
`;

export const IMAGE_PROMPT_TEMPLATE = (location: string, weatherVisual: string) => 
  `Cute dreamy 3D tilt-shift miniature diorama of ${location} landmark, ultra-detailed banana-style soft pastel rendering, dreamy studio ghibli x pixar style, fluffy volumetric clouds, ${weatherVisual} made of cotton floating above, soft golden rim lighting, large white empty space around the island, floating in the sky, high quality, 8k, cinematic, masterpiece --stylize 750 --v 6`;
