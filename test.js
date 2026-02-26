const text = "$a$ is to $b$ / $a$ to $b$";
const parts = text.split(/(\$.*?\$|\*\*.*?\*\*|\*[^*]+\*)/g);
console.log(parts);
