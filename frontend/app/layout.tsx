import "../globals.css"
import { Geist, Geist_Mono, Rubik_Distressed } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"

const geist     = Geist({variable:"--font-geist",       subsets:["latin"]})
const geistMono = Geist_Mono({variable:"--font-mono",   subsets:["latin"]})
const rubik     = Rubik_Distressed({variable:"--font-rubik", weight:"400", subsets:["latin"]})


export const metadata = {
  title:  'The Big Melt',
  description: 'A data-driven chronicle of sea-ice decline',
};

export default function RootLayout({children}:{children:React.ReactNode}) {
  return (
    <html lang="en" className="scroll-smooth dark" suppressHydrationWarning>

      <body
      className={`${geist.variable} ${geistMono.variable} ${rubik.variable} font-sans`}

      > 
         <ThemeProvider
         attribute="class"
         defaultTheme="dark"
         enableSystem={false}
         disableTransitionOnChange
         >
        {children}
        </ThemeProvider>
      </body>
    </html>
  )
}