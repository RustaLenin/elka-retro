export const component_template = `
  <div class="overlay"></div>
  <div class="container" style="transition:opacity {{fadeinduration}}ms;">
    <svg class="spinner" viewBox="0 0 50 50" style="animation: spin {{spinduration}}ms linear infinite;">
      <circle cx="25" cy="25" r="20" fill="none" stroke="var(--color-primary)" stroke-width="5" stroke-linecap="round" stroke-dasharray="100" stroke-dashoffset="85"/>
    </svg>
    <div class="label">{{label}}</div>
  </div>
  <style>
    block-loader > .container { opacity:1; transition:opacity {{fadeinduration}}ms; }
    block-loader.hiding > .container { opacity:0; transition:opacity {{fadeoutduration}}ms; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
  </style>
`;


