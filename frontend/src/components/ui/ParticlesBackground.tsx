import { useId, useLayoutEffect } from "react";

declare global {
  interface Window {
    particlesJS?: (tagId: string, config: unknown) => void;
    pJSDom?: Array<{
      pJS?: {
        canvas?: {
          el?: HTMLCanvasElement;
        };
        fn?: {
          vendors?: {
            destroypJS?: () => void;
          };
        };
      };
    }>;
  }
}

interface ParticlesBackgroundProps {
  colors?: string[];
  size?: number;
  countDesktop?: number;
  countTablet?: number;
  countMobile?: number;
  zIndex?: number;
  height?: string;
}

const SCRIPT_SELECTOR = 'script[data-particles-js="true"]';

export default function ParticlesBackground({
  colors = ["#ff223e", "#5d1eb2", "#ff7300"],
  size = 3,
  countDesktop = 60,
  countTablet = 50,
  countMobile = 40,
  zIndex = 0,
  height = "100vh",
}: ParticlesBackgroundProps) {
  const particlesId = `js-particles-${useId().replace(/:/g, "")}`;

  useLayoutEffect(() => {
    const getParticleCount = () => {
      const screenWidth = window.innerWidth;

      if (screenWidth > 1024) {
        return countDesktop;
      }
      if (screenWidth > 768) {
        return countTablet;
      }

      return countMobile;
    };

    const destroyParticles = () => {
      const particlesElement = document.getElementById(particlesId);
      if (particlesElement) {
        particlesElement.innerHTML = "";
      }

      if (!Array.isArray(window.pJSDom)) {
        return;
      }

      window.pJSDom = window.pJSDom.filter((instance) => {
        const parentId = instance?.pJS?.canvas?.el?.parentElement?.id;

        if (parentId === particlesId) {
          instance?.pJS?.fn?.vendors?.destroypJS?.();
          return false;
        }

        return true;
      });
    };

    const initParticles = () => {
      const particlesElement = document.getElementById(particlesId);
      if (!particlesElement || !window.particlesJS) {
        return;
      }

      destroyParticles();

      window.particlesJS(particlesId, {
        particles: {
          number: {
            value: getParticleCount(),
          },
          color: {
            value: colors,
          },
          shape: {
            type: "circle",
          },
          opacity: {
            value: 1,
            random: false,
          },
          size: {
            value: size,
            random: true,
          },
          line_linked: {
            enable: false,
          },
          move: {
            enable: true,
            speed: 2,
            direction: "none",
            random: true,
            straight: false,
            out_mode: "out",
          },
        },
        interactivity: {
          detect_on: "canvas",
          events: {
            onhover: {
              enable: false,
            },
            onclick: {
              enable: false,
            },
            resize: true,
          },
        },
        retina_detect: true,
      });
    };

    let script = document.querySelector<HTMLScriptElement>(SCRIPT_SELECTOR);
    const handleLoad = () => initParticles();

    if (window.particlesJS) {
      initParticles();
    } else if (script) {
      script.addEventListener("load", handleLoad);
    } else {
      script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js";
      script.dataset.particlesJs = "true";
      script.addEventListener("load", handleLoad);
      document.body.appendChild(script);
    }

    return () => {
      script?.removeEventListener("load", handleLoad);
      destroyParticles();
    };
  }, [colors, countDesktop, countMobile, countTablet, particlesId, size]);

  return (
    <div
      id={particlesId}
      style={{
        width: "100%",
        height,
        position: "absolute",
        top: 0,
        left: 0,
        zIndex,
        pointerEvents: "none",
      }}
    >
      <style>{`
        #${particlesId} canvas {
          position: absolute;
          width: 100%;
          height: 100%;
        }

        #${particlesId} .particles-js-canvas-el {
          position: absolute;
        }

        #${particlesId} .particles-js-canvas-el circle {
          fill: currentColor;
          filter: url(#${particlesId}-glow);
        }
      `}</style>
      <svg xmlns="http://www.w3.org/2000/svg" version="1.1" className="absolute h-0 w-0">
        <defs>
          <filter id={`${particlesId}-glow`}>
            <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>
    </div>
  );
}
