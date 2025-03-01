import { Icon } from "@chakra-ui/react";

export const HamburgerIcon = ({ ...props }) => {
  return (
    <Icon {...props}>
      <svg
        stroke="currentColor"
        fill="none"
        strokeWidth="2"
        viewBox="0 0 23 23"
        strokeLinecap="round"
        strokeLinejoin="round"
        height="1em"
        width="1em"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M3 12h18"></path>
        <path d="M3 18h18"></path>
        <path d="M3 6h18"></path>
      </svg>
    </Icon>
  );
};
