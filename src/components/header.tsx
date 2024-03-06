"use client";

import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import logo from "../../public/images/logo.png";
import { FaBars, FaTimes } from "react-icons/fa";
import { Button } from "./ui/button";

const links = [
  {
    title: "Listas",
    href: "/lists",
  },
  {
    title: "Calendario",
    href: "/lists",
  },
  {
    title: "MAM",
    href: "/lists",
  },
  {
    title: "Padlet",
    href: "/lists",
  },
  {
    title: "Sobre la Web",
    href: "/lists",
  },
];

export const Header = () => {
  const user = useUser();
  const [nav, setNav] = useState(false);

  return (
    <header className="flex justify-between bg-slate-900 p-5">
      <div className="nav flex w-full items-center justify-between">
        {user.isSignedIn && (
          <div
            onClick={() => setNav(!nav)}
            className="z-10 cursor-pointer pr-4 text-gray-500 md:hidden"
          >
            {nav ? <FaTimes size={30} /> : <FaBars size={30} />}
          </div>
        )}
        <Link href={"/"}>
          <Image src={logo} alt={"Míralos Morir V2 logo"} width={150} />
        </Link>
        {user.isSignedIn && (
          <>
            <ul className="hidden px-2 md:flex">
              {links.map((link, idx) => (
                <li key={idx} className="px-1">
                  <Button size={"lg"} variant="ghost">
                    <Link href={link.href} className="font-semibold">
                      {link.title}
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>

            {nav && (
              <ul className="absolute left-0 top-0 flex h-screen w-full flex-col items-center justify-center bg-slate-900 text-lg text-slate-200 duration-200 hover:scale-125">
                {links.map((link, idx) => (
                  <li
                    key={idx}
                    className="cursor-pointer px-4 py-6 text-4xl capitalize"
                  >
                    <Link onClick={() => setNav(!nav)} href={link.href}>
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        <SignedIn>
          {/* Mount the UserButton component */}
          <UserButton
            appearance={{
              elements: {
                avatarBox: "h-12 w-12",
              },
            }}
          />
        </SignedIn>
        <SignedOut>
          {/* Signed out users get sign in button */}
          <SignInButton>Login</SignInButton>
        </SignedOut>
      </div>
    </header>
  );
};
