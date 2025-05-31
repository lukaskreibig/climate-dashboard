"use client";
import React, { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, MotionPathPlugin);

export default function ProgressTimeline() {
  useLayoutEffect(() => {
    // clear any old markers
    console.clear();
    gsap.defaults({ ease: "none" });

    // pulse animations on later balls & labels
    const pulses = gsap.timeline({
      defaults: {
        duration: 0.05,
        autoAlpha: 1,
        scale: 2,
        transformOrigin: "center",
        ease: "elastic(2.5, 1)"
      }
    })
      .to(".ball02, .text01", {}, 0.2)
      .to(".ball03, .text02", {}, 0.33)
      .to(".ball04, .text03", {}, 0.46);

    // main timeline tied to scroll position of the entire document
    const main = gsap.timeline({
      scrollTrigger: {
        trigger: "#svg-stage",
        start: "top center",
        end: "bottom center",
        scrub: true,
        markers: false
      }
    })
      // show first ball immediately
      .to(".ball01", { duration: 0.01, autoAlpha: 1 })
      // draw the path from 0→100%
      .from(".theLine", { drawSVG: 0 }, 0)
      // move the first ball along the path
      .to(
        ".ball01",
        {
          motionPath: {
            path: ".theLine",
            align: ".theLine",
            alignOrigin: [0.5, 0.5]
          }
        },
        0
      )
      // then run the pulses sub‐timeline
      .add(pulses, 0);

    return () => {
      // cleanup
      main.scrollTrigger!.kill();
      main.kill();
      pulses.kill();
    };
  }, []);

  return (
    <>
      <h1 className="header-section">Scroll to see a timeline animation</h1>

      <svg
        id="svg-stage"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 600 1200"
      >
        <path className="line line01" d="M 10 200 600 200" />
        <path className="line line02" d="M 10 400 600 400" />
        <path className="line line03" d="M 10 600 600 600" />
        <path className="line line04" d="M 10 800 600 800" />
        <path className="line line05" d="M 10 1000 600 1000" />

        <text className="text01" x="30" y="190">
          2018
        </text>
        <text className="text02" x="30" y="390">
          2019
        </text>
        <text className="text03" x="30" y="590">
          2020
        </text>

        <path
          className="theLine"
          d="
            M -5,0
            Q 450 230 300 450 
            T 130 750
            Q 100 850 300 1000
            T 150 1200
          "
          fill="none"
          stroke="white"
          strokeWidth="10"
        />

        <circle className="ball ball01" r="20" cx="50" cy="100" />
        <circle className="ball ball02" r="20" cx="278" cy="201" />
        <circle className="ball ball03" r="20" cx="327" cy="401" />
        <circle className="ball ball04" r="20" cx="203" cy="601" />
      </svg>

      <style jsx global>{`
        @font-face {
          font-display: block;
          font-family: Mori;
          font-style: normal;
          font-weight: 400;
          src: url(https://assets.codepen.io/16327/PPMori-Regular.woff)
            format("woff");
        }
        body {
          width: 100%;
          height: 400vh; /* enough scroll space */
          background: black;
          color: white;
          font-family: "Mori", sans-serif;
        }
        .header-section {
          position: relative;
          text-align: center;
          margin: 100px auto 0;
        }
        #svg-stage {
          display: block;
          margin: 60vh auto 0;
          max-width: 600px;
          overflow: visible;
        }
        .ball {
          fill: white;
          visibility: hidden;
        }
        .line {
          fill: none;
          stroke: white;
          stroke-width: 2px;
        }
        text {
          fill: white;
          font-size: 15px;
          visibility: hidden;
        }
      `}</style>
    </>
  );
}