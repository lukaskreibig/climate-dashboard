'use client'
import { AppShell } from '@mantine/core';
import ClimateReportPage from './climatereport/page';

export default function Home () {
  // const [opened, { toggle }] = useDisclosure();

  return (
    <AppShell
      // header={{ height: 60 }}
      // navbar={{
      //   width: 300,
      //   breakpoint: 'sm',
      //   collapsed: { mobile: !opened },
      // }}
      padding="md"
    >
      {/* <AppShell.Header>
  <div className="flex items-center justify-center w-full p-4 bg-gradient-to-r from-blue-500 to-green-500">
    <Burger
      opened={opened}
      onClick={toggle}
      hiddenFrom="sm"
      size="sm"
      className="mr-4"
    />
    <div className="text-center">
      <h1 className="text-4xl font-extrabold text-white tracking-widest">
        Climate Stories - Data-Driven Exploration of Our Changing World

      </h1>
      <p className="mt-2 text-lg text-white opacity-80">
      </p>
    </div>
  </div>
</AppShell.Header> */}


      {/* <AppShell.Navbar p="md">Navbar</AppShell.Navbar> */}

      <AppShell.Main>
        <ClimateReportPage /> 
        </AppShell.Main>
    </AppShell>
  );
}