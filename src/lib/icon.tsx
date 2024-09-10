import { JSX } from "solid-js";

export const Line = {
  Basketball: (props: JSX.IntrinsicElements["svg"]) => {
    return (
      <svg width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <rect x="2" y="2.5" width="20" height="20" rx="10" stroke="currentColor" stroke-width="1.5" />
        <path
          d="M19 5.3584C17.1486 7.17332 16 9.70244 16 12.4998C16 15.2972 17.1486 17.8263 19 19.6413"
          stroke="currentColor"
          stroke-width="1.5"
        />
        <path
          d="M5 5.5C6.85136 7.27898 8 9.75801 8 12.5C8 15.242 6.85136 17.721 5 19.5"
          stroke="currentColor"
          stroke-width="1.5"
        />
        <path d="M12 2.5V22.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        <path d="M22 12.5L2 12.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      </svg>
    );
  },

  Back: (props: JSX.IntrinsicElements["svg"]) => {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path
          d="M8.00009 16L4.7072 12.7071C4.31668 12.3166 4.31668 11.6834 4.7072 11.2929L8.00009 8M5.00009 12L19.0001 12"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
      </svg>
    );
  },

  Box2: (props: JSX.IntrinsicElements["svg"]) => {
    return (
      <svg width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path
          d="M2 6.66667V17.6667C2 18.0704 2.24274 18.4345 2.61538 18.5897L12 22.5M2 6.66667L11.2308 2.82051C11.7231 2.61538 12.2769 2.61538 12.7692 2.82051L17 4.58333M2 6.66667L7 8.75M12 10.8333V22.5M12 10.8333L22 6.66667M12 10.8333L7 8.75M12 22.5L21.3846 18.5897C21.7573 18.4345 22 18.0704 22 17.6667V6.66667M22 6.66667L17 4.58333M7 8.75L17 4.58333"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linejoin="round"
        />
      </svg>
    );
  },

  Calculactor: (props: JSX.IntrinsicElements["svg"]) => {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <rect x="4" y="2" width="16" height="20" rx="4" stroke="currentColor" stroke-width="1.5" />
        <rect x="8" y="6" width="8" height="3" rx="1" stroke="currentColor" stroke-width="1.5" />
        <path d="M9 18H8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        <path d="M9 14H8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        <path d="M15 18H16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        <path d="M15 14L16 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      </svg>
    );
  },

  Calendar: (props: JSX.IntrinsicElements["svg"]) => {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <rect x="3" y="3.5" width="18" height="18" rx="5" stroke="currentColor" stroke-width="1.5" />
        <path d="M3 8.49997H21" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
        <path
          d="M16.5 1.99997L16.5 4.99997"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M7.5 1.99997L7.5 4.99997"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M6.5 12.5H7.5"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M11.5 12.5H12.5"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M16.5 12.5H17.5"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M6.5 16.5H7.5"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M11.5 16.5H12.5"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M16.5 16.5H17.5"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    );
  },

  Category2: (props: JSX.IntrinsicElements["svg"]) => {
    return (
      <svg width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <rect x="4" y="4.5" width="7" height="4" rx="2" stroke="currentColor" stroke-width="1.5" />
        <rect x="4" y="11.5" width="7" height="10" rx="2.5" stroke="currentColor" stroke-width="1.5" />
        <rect x="14" y="4.5" width="7" height="10" rx="2.5" stroke="currentColor" stroke-width="1.5" />
        <rect x="14" y="17.5" width="7" height="4" rx="2" stroke="currentColor" stroke-width="1.5" />
      </svg>
    );
  },

  Collapse: (props: JSX.IntrinsicElements["svg"]) => {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path
          d="M5.84611 13.5382L9.4615 13.5382C10.0138 13.5382 10.4615 13.9859 10.4615 14.5382L10.4615 18.1535"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
        <path d="M9.69224 14.3073L4.30762 19.6919" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        <path
          d="M13.5382 5.84654L13.5382 9.46193C13.5382 10.0142 13.9859 10.4619 14.5382 10.4619L18.1535 10.4619"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
        <path d="M14.3073 9.69266L19.6919 4.30804" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      </svg>
    );
  },

  CloudUpload: (props: JSX.IntrinsicElements["svg"]) => {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path
          d="M18 18.2003C20.2459 17.9773 22 16.0824 22 13.7778C22 11.1049 19.5452 9.00249 16.9198 9.37847C16.9155 9.37908 16.9113 9.3769 16.9093 9.37305C15.9052 7.37277 13.8351 6 11.4444 6C8.25974 6 5.64402 8.43609 5.35907 11.5465C5.3586 11.5516 5.35421 11.5556 5.34902 11.5556C3.52707 11.554 2 13.0606 2 14.8889C2 16.7298 3.49238 18.2222 5.33333 18.2222H6"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
        <path
          d="M9.5 16.5L11.6464 14.3536C11.8417 14.1583 12.1583 14.1583 12.3535 14.3536L14.5 16.5"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
        <path d="M12 15L12 21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      </svg>
    );
  },

  Coins: (props: JSX.IntrinsicElements["svg"]) => {
    return (
      <svg width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path
          d="M19 7C19 8.38071 15.866 9.5 12 9.5C8.13401 9.5 5 8.38071 5 7M19 7C19 5.61929 15.866 4.5 12 4.5C8.13401 4.5 5 5.61929 5 7M19 7V19C19 20.3807 15.866 21.5 12 21.5C8.13401 21.5 5 20.3807 5 19V7M19 11C19 12.3807 15.866 13.5 12 13.5C8.13401 13.5 5 12.3807 5 11M19 15C19 16.3807 15.866 17.5 12 17.5C8.13401 17.5 5 16.3807 5 15"
          stroke="currentColor"
          stroke-width="1.5"
        />
      </svg>
    );
  },

  ColorPalette: (props: JSX.IntrinsicElements["svg"]) => {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <rect x="2" y="2" width="10" height="20" rx="3" stroke="currentColor" stroke-width="1.5" />
        <path
          d="M12.1421 5L13.0208 4.12132C14.1924 2.94975 16.0919 2.94975 17.2634 4.12132L20.0919 6.94975C21.2634 8.12132 21.2634 10.0208 20.0919 11.1924L12.1421 19.1421"
          stroke="currentColor"
          stroke-width="1.5"
        />
        <path
          d="M19 12V12C20.6568 12 22 13.3431 22 15L22 19C22 20.6569 20.6568 22 19 22L6.99998 22"
          stroke="currentColor"
          stroke-width="1.5"
        />
        <circle cx="7" cy="18" r="1" fill="currentColor" />
      </svg>
    );
  },

  Close: (props: JSX.IntrinsicElements["svg"]) => {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" stroke-width="1.5" />
        <path
          d="M9.8787 14.1215L14.1213 9.87891"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M9.8787 9.87894L14.1213 14.1216"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    );
  },

  Expand: (props: JSX.IntrinsicElements["svg"]) => {
    return (
      <svg width="25" height="24" viewBox="0 0 25 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path
          d="M9.11539 19.3846L5.5 19.3846C4.94772 19.3846 4.5 18.9369 4.5 18.3846L4.5 14.7692M5.26918 18.6155L10.6538 13.2309M19.8844 8.61514L19.8844 4.99976C19.8844 4.44747 19.4367 3.99976 18.8844 3.99976L15.269 3.99976M19.1152 4.76902L13.7305 10.1536"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
      </svg>
    );
  },

  Flag: (props: JSX.IntrinsicElements["svg"]) => {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path
          d="M4 3.5C4 2.67157 4.67157 2 5.5 2H10.5C11.3284 2 12 2.67157 12 3.5V11.5C12 12.3284 11.3284 13 10.5 13H4V3.5Z"
          stroke="currentColor"
          stroke-width="1.5"
        />
        <path
          d="M12 4H18.0362C18.8535 4 19.3257 4.9272 18.845 5.58817L16.8555 8.32366C16.3455 9.02496 16.3455 9.97504 16.8555 10.6763L18.845 13.4118C19.3257 14.0728 18.8535 15 18.0362 15H13C12.4477 15 12 14.5523 12 14V4Z"
          stroke="currentColor"
          stroke-width="1.5"
        />
        <path d="M4 22L4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    );
  },

  Filter: (props: JSX.IntrinsicElements["svg"]) => {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path
          d="M2 4C2 2.89543 2.89543 2 4 2H20C21.1046 2 22 2.89543 22 4V4.81751C22 5.57739 21.7116 6.30895 21.1932 6.86447L15.5379 12.9237C15.1922 13.294 15 13.7817 15 14.2883V18.382C15 18.7607 14.786 19.107 14.4472 19.2764L10.4472 21.2764C9.78231 21.6088 9 21.1253 9 20.382V14.2883C9 13.7817 8.80776 13.294 8.46211 12.9237L2.80683 6.86446C2.28836 6.30895 2 5.57739 2 4.81751V4Z"
          stroke="currentColor"
          stroke-width="1.5"
        />
      </svg>
    );
  },

  Gamepad: (props: JSX.IntrinsicElements["svg"]) => {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path
          d="M2 10.0005C2 7.04241 4.55409 4.73099 7.49752 5.02533L11.403 5.41588C11.8 5.45558 12.2 5.45558 12.597 5.41588L16.5025 5.02533C19.4459 4.73099 22 7.04241 22 10.0005V16C22 19.5933 17.3041 20.9552 15.3815 17.9196C14.0112 15.7559 10.8803 15.6836 9.4116 17.7818L9.12736 18.1878C6.93073 21.3259 2 19.7716 2 15.9411V10.0005Z"
          stroke="currentColor"
          stroke-width="1.5"
        />
        <circle cx="18" cy="9.97559" r="1" fill="currentColor" />
        <circle cx="16" cy="12.9756" r="1" fill="currentColor" />
        <path
          d="M8 13.4756L8 9.47559"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M6 11.4756H10"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    );
  },

  Home: (props: JSX.IntrinsicElements["svg"]) => {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path
          d="M2.5 10.9384C2.5 9.71422 3.06058 8.55744 4.02142 7.79888L9.52142 3.45677C10.9747 2.30948 13.0253 2.30948 14.4786 3.45677L19.9786 7.79888C20.9394 8.55744 21.5 9.71422 21.5 10.9384V17.5C21.5 19.7091 19.7091 21.5 17.5 21.5H16C15.4477 21.5 15 21.0523 15 20.5V17.5C15 16.3954 14.1046 15.5 13 15.5H11C9.89543 15.5 9 16.3954 9 17.5V20.5C9 21.0523 8.55228 21.5 8 21.5H6.5C4.29086 21.5 2.5 19.7091 2.5 17.5L2.5 10.9384Z"
          stroke="currentColor"
          stroke-width="1.5"
        />
      </svg>
    );
  },

  Laptop: (props: JSX.IntrinsicElements["svg"]) => {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <rect x="2" y="17" width="20" height="3" rx="1" stroke="currentColor" stroke-width="1.5" />
        <rect x="3" y="5" width="18" height="12" rx="1" stroke="currentColor" stroke-width="1.5" />
        <path d="M14 5.5L10 5.5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
      </svg>
    );
  },

  Loading: (props: JSX.IntrinsicElements["svg"]) => {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M12 2L12 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        <path
          d="M12 19L12 22"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M22 12L19 12"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path d="M5 12L2 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        <path
          d="M19.0711 4.92894L16.9497 7.05026"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M7.05025 16.95L4.92892 19.0713"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M4.92896 4.92891L7.05028 7.05023"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M16.9497 16.95L19.071 19.0713"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    );
  },

  Location: (props: JSX.IntrinsicElements["svg"]) => {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path
          d="M20 10.4167C20 15.8445 13.6 21.5 12 21.5C10.4 21.5 4 15.8445 4 10.4167C4 6.04441 7.58172 2.5 12 2.5C16.4183 2.5 20 6.04441 20 10.4167Z"
          stroke="currentColor"
          stroke-width="1.5"
        />
        <circle cx="3" cy="3" r="3" transform="matrix(-1 0 0 1 15 7)" stroke="currentColor" stroke-width="1.5" />
      </svg>
    );
  },

  Light: (props: JSX.IntrinsicElements["svg"]) => {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path
          d="M13.8154 10.4211C13.7049 10.4211 13.6154 10.3316 13.6154 10.2211V2.60383C13.6154 2.41125 13.3699 2.32994 13.2549 2.48445L5.59411 12.7804C5.34868 13.1103 5.58411 13.5789 5.99525 13.5789H10.1846C10.2951 13.5789 10.3846 13.6684 10.3846 13.7789V21.3962C10.3846 21.5888 10.6301 21.6701 10.7451 21.5156L18.4059 11.2196C18.6513 10.8897 18.4159 10.4211 18.0047 10.4211H13.8154Z"
          stroke="currentColor"
          stroke-width="1.5"
        />
      </svg>
    );
  },

  Left: (props: JSX.IntrinsicElements["svg"]) => {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path
          d="M15 19L9.66939 12.7809C9.2842 12.3316 9.2842 11.6684 9.66939 11.2191L15 5"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
      </svg>
    );
  },

  Logo: (props: JSX.IntrinsicElements["svg"]) => {
    return (
      <svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" fill="none" {...props}>
        <rect x="0.75" y="0.75" width="48.5" height="48.5" rx="24.25" />
        <rect x="0.75" y="0.75" width="48.5" height="48.5" rx="24.25" stroke-width="1.5" class="stroke-accent-color" />
        <rect x="12.3611" y="12.2222" width="8.61111" height="27.7778" rx="4.30556" class="fill-accent-color" />
        <rect
          x="23.2077"
          y="28.6913"
          width="5.20137"
          height="16.7786"
          rx="2.60068"
          transform="rotate(-45 23.2077 28.6913)"
          class="fill-brand-color-2nd"
        />
        <rect
          x="35.0366"
          y="25"
          width="5.20137"
          height="16.7786"
          rx="2.60068"
          transform="rotate(45 35.0366 25)"
          class="fill-brand-color-2nd"
        />
        <rect x="24.4444" y="11.8055" width="12.7778" height="12.7778" rx="6.38889" class="fill-brand-color-3rd" />
      </svg>
    );
  },

  Money: (props: JSX.IntrinsicElements["svg"]) => {
    return (
      <svg width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <g clip-path="url(#clip0_359_732)">
          <path
            d="M15.6255 10.8455C16.2256 9.94581 16.9958 9.17214 17.8928 8.56808"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-miterlimit="10"
            stroke-linecap="round"
          />
          <path
            d="M6.60767 7.00553C4.6098 8.22009 3.09963 10.0952 2.33873 12.306C1.57585 14.5314 1.60471 16.9521 2.42043 19.1587C2.63432 19.739 3.01883 20.2411 3.52341 20.5987C4.02129 20.9531 4.61781 21.1424 5.22894 21.14H6.25022V22.0183C6.24616 22.2404 6.28608 22.4612 6.36767 22.6679C6.44926 22.8745 6.57092 23.063 6.72563 23.2225C6.88035 23.3819 7.06508 23.5092 7.26918 23.597C7.47328 23.6848 7.69273 23.7314 7.9149 23.734C8.12924 23.7308 8.34078 23.6849 8.53718 23.5989C8.73357 23.513 8.91087 23.3888 9.05873 23.2336C9.36282 22.9186 9.53146 22.497 9.52852 22.0591V21.14H13.92V22.0183C13.9067 22.3504 13.9943 22.6788 14.1714 22.9601C14.3485 23.2415 14.6067 23.4625 14.9119 23.5941C15.2172 23.7257 15.5552 23.7617 15.8813 23.6974C16.2074 23.633 16.5064 23.4713 16.7387 23.2336C17.0383 22.9157 17.2062 22.496 17.2085 22.0591V21.14H19.2511C19.4764 21.1419 19.7006 21.1074 19.9149 21.0379C20.3658 20.8957 20.7595 20.613 21.0383 20.2311C21.3162 19.8402 21.4661 19.3728 21.4672 18.8932H22.6213C22.7838 18.8932 22.9397 18.8286 23.0546 18.7137C23.1695 18.5988 23.234 18.4429 23.234 18.2804V15.7374C23.234 15.5749 23.1695 15.4191 23.0546 15.3042C22.9397 15.1892 22.7838 15.1247 22.6213 15.1247H21.4877C21.4292 13.8855 21.1454 12.6673 20.6502 11.5298C21.3178 10.4835 21.6722 9.26798 21.6715 8.02681C21.6748 7.74 21.6578 7.45332 21.6204 7.16894C20.4589 7.24028 19.3391 7.62884 18.383 8.29234C17.5282 7.48275 16.5356 6.83251 15.4519 6.37234"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linejoin="round"
          />
          <path
            d="M7.9966 9.43617C7.16652 8.92959 6.52461 8.16576 6.16851 7.26085C5.81511 6.3642 5.77551 5.37435 6.05617 4.45234C6.33883 3.52472 6.92057 2.71675 7.71064 2.15447C8.51374 1.57607 9.47838 1.26485 10.4681 1.26485C11.4578 1.26485 12.4224 1.57607 13.2255 2.15447C14.0156 2.71675 14.5973 3.52472 14.88 4.45234C15.1607 5.37435 15.1211 6.3642 14.7677 7.26085C14.4116 8.16576 13.7697 8.92959 12.9396 9.43617"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-miterlimit="10"
          />
          <path
            d="M6.43404 9.43617H14.4817"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-miterlimit="10"
            stroke-linecap="round"
          />
          <path
            d="M10.1106 7.90426H10.8153V6.88298H12V6.53574H10.8153V6.10681H12V5.71872H10.9787L12.4392 3.44128H11.6221L10.9787 4.61574C10.7745 5.03447 10.6723 5.22851 10.4783 5.56553C10.2945 5.22851 10.1923 5.04468 9.97787 4.61574L9.29362 3.44128H8.46638L9.95745 5.71872H8.93617V6.10681H10.1413V6.53574H8.93617V6.91362H10.1413L10.1106 7.90426Z"
            fill="currentColor"
          />
          <path
            d="M17.1064 13.9195C17.5407 13.9195 17.8927 13.5675 17.8927 13.1332C17.8927 12.6989 17.5407 12.3468 17.1064 12.3468C16.6721 12.3468 16.32 12.6989 16.32 13.1332C16.32 13.5675 16.6721 13.9195 17.1064 13.9195Z"
            fill="currentColor"
          />
          <path
            d="M0.786383 16.3706C1.22069 16.3706 1.57277 16.0186 1.57277 15.5843C1.57277 15.1499 1.22069 14.7979 0.786383 14.7979C0.352076 14.7979 0 15.1499 0 15.5843C0 16.0186 0.352076 16.3706 0.786383 16.3706Z"
            fill="currentColor"
          />
        </g>
        <defs>
          <clipPath id="clip0_359_732">
            <rect width="24" height="24" fill="white" transform="translate(0 0.5)" />
          </clipPath>
        </defs>
      </svg>
    );
  },

  Search: (props: JSX.IntrinsicElements["svg"]) => {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <circle
          cx="11"
          cy="11"
          r="8"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M16.5 16.9579L21.5 21.958"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    );
  },

  Settings: (props: JSX.IntrinsicElements["svg"]) => {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <circle cx="3" cy="3" r="3" transform="matrix(-1 0 0 1 15 9)" stroke="currentColor" stroke-width="1.5" />
        <path
          d="M16.5001 4.9375L16.8751 4.28798L16.8751 4.28798L16.5001 4.9375ZM16.5 19.0621L16.125 18.4126L16.125 18.4126L16.5 19.0621ZM7.49999 19.0621L7.12499 19.7117L7.12499 19.7117L7.49999 19.0621ZM7.49999 4.9375L7.87499 5.58702L7.49999 4.9375ZM8.92293 3.01508L8.19223 2.84601L8.92293 3.01508ZM5.31183 18.7402L5.13965 18.0102L5.31183 18.7402ZM4.40294 18.503L4.97248 18.015L4.40294 18.503ZM9.53921 21.695L9.72319 20.9679L9.53921 21.695ZM8.92299 20.9848L9.6537 20.8158L8.92299 20.9848ZM15.077 20.9848L14.3463 20.8158L15.077 20.9848ZM14.4608 21.6949L14.6448 22.422L14.4608 21.6949ZM19.597 18.503L19.0274 18.015L19.597 18.503ZM21.4437 8.70289L22.1517 8.45569L21.4437 8.70289ZM21.0935 9.68352L20.6166 9.10469L21.0935 9.68352ZM18.6879 5.2595L18.5158 4.52952L18.6879 5.2595ZM21.0935 14.3165L20.6166 14.8953L21.0935 14.3165ZM21.4437 15.2971L20.7356 15.0499L21.4437 15.2971ZM15.0771 3.01511L14.3464 3.18418L15.0771 3.01511ZM14.3464 3.18418C14.5722 4.16005 15.1878 5.04592 16.1251 5.58702L16.8751 4.28798C16.3127 3.96329 15.9438 3.43381 15.8078 2.84603L14.3464 3.18418ZM16.1251 5.58702C16.986 6.08408 17.9638 6.2008 18.8601 5.98949L18.5158 4.52952C17.9767 4.65663 17.3921 4.5865 16.8751 4.28798L16.1251 5.58702ZM22.1517 8.45569C21.7062 7.17937 21.0271 6.01337 20.1662 5.00871L19.0272 5.98471C19.7687 6.85004 20.3527 7.85328 20.7356 8.95008L22.1517 8.45569ZM20.7499 12C20.7499 11.3006 21.0681 10.6762 21.5704 10.2624L20.6166 9.10469C19.7833 9.79128 19.2499 10.8337 19.2499 12H20.7499ZM21.5704 13.7376C21.0681 13.3238 20.7499 12.6994 20.7499 12H19.2499C19.2499 13.1663 19.7833 14.2087 20.6166 14.8953L21.5704 13.7376ZM20.1665 18.991C21.0272 17.9864 21.7062 16.8205 22.1517 15.5443L20.7356 15.0499C20.3527 16.1466 19.7688 17.1497 19.0274 18.015L20.1665 18.991ZM16.875 19.7117C17.3921 19.4131 17.9767 19.343 18.5159 19.4702L18.8603 18.0102C17.9639 17.7988 16.986 17.9155 16.125 18.4126L16.875 19.7117ZM15.8077 21.1538C15.9437 20.566 16.3126 20.0364 16.875 19.7117L16.125 18.4126C15.1877 18.9538 14.572 19.8398 14.3463 20.8158L15.8077 21.1538ZM11.9999 22.75C12.9117 22.75 13.7979 22.6363 14.6448 22.422L14.2768 20.9679C13.5492 21.152 12.7866 21.25 11.9999 21.25V22.75ZM9.35524 22.4221C10.2021 22.6363 11.0883 22.75 11.9999 22.75V21.25C11.2134 21.25 10.4508 21.152 9.72319 20.9679L9.35524 22.4221ZM7.12499 19.7117C7.68743 20.0364 8.05631 20.566 8.19227 21.1538L9.6537 20.8158C9.42796 19.8398 8.81232 18.9538 7.87499 18.4126L7.12499 19.7117ZM5.484 19.4702C6.02321 19.343 6.60787 19.4131 7.12499 19.7117L7.87499 18.4126C7.01395 17.9155 6.036 17.7988 5.13965 18.0102L5.484 19.4702ZM1.84816 15.5443C2.29368 16.8205 2.97267 17.9864 3.83341 18.991L4.97248 18.015C4.23112 17.1498 3.6472 16.1466 3.26434 15.0499L1.84816 15.5443ZM3.24998 12C3.24998 12.6994 2.93179 13.3238 2.42947 13.7376L3.3833 14.8953C4.21662 14.2087 4.74998 13.1663 4.74998 12H3.24998ZM2.42947 10.2623C2.93179 10.6762 3.24998 11.3006 3.24998 12H4.74998C4.74998 10.8337 4.21662 9.79126 3.3833 9.10468L2.42947 10.2623ZM3.83369 5.00867C2.97282 6.01334 2.29373 7.17934 1.84816 8.45567L3.26434 8.95007C3.64724 7.85326 4.23126 6.85001 4.97273 5.98468L3.83369 5.00867ZM7.12499 4.28798C6.60792 4.58651 6.02331 4.65664 5.48414 4.5295L5.13988 5.98946C6.03617 6.20081 7.01403 6.0841 7.87499 5.58702L7.12499 4.28798ZM8.19223 2.84601C8.05623 3.43379 7.68737 3.96329 7.12499 4.28798L7.87499 5.58702C8.81221 5.04591 9.42782 4.16003 9.65362 3.18415L8.19223 2.84601ZM11.9999 1.25C11.0883 1.25 10.202 1.36366 9.35515 1.57796L9.72312 3.03213C10.4507 2.84802 11.2133 2.75 11.9999 2.75V1.25ZM14.6449 1.578C13.798 1.36368 12.9117 1.25 11.9999 1.25V2.75C12.7866 2.75 13.5493 2.84803 14.2769 3.03217L14.6449 1.578ZM9.65362 3.18415C9.66923 3.11668 9.69568 3.06909 9.7162 3.04413C9.73383 3.02269 9.73697 3.02862 9.72312 3.03213L9.35515 1.57796C8.66395 1.75286 8.30705 2.3498 8.19223 2.84601L9.65362 3.18415ZM3.3833 9.10468C3.32242 9.05451 3.28703 9.00024 3.27283 8.96394C3.26089 8.93341 3.26968 8.93478 3.26434 8.95007L1.84816 8.45567C1.58215 9.21766 1.9943 9.9038 2.42947 10.2623L3.3833 9.10468ZM5.13965 18.0102C5.07242 18.0261 5.01815 18.0235 4.98668 18.0162C4.95963 18.0099 4.96335 18.0044 4.97248 18.015L3.83341 18.991C4.29646 19.5314 4.98843 19.5871 5.484 19.4702L5.13965 18.0102ZM9.72319 20.9679C9.73705 20.9714 9.7339 20.9773 9.71627 20.9559C9.69575 20.9309 9.6693 20.8833 9.6537 20.8158L8.19227 21.1538C8.30705 21.6501 8.66396 22.2471 9.35524 22.4221L9.72319 20.9679ZM14.3463 20.8158C14.3307 20.8833 14.3042 20.9309 14.2837 20.9559C14.2661 20.9773 14.263 20.9714 14.2768 20.9679L14.6448 22.422C15.336 22.2471 15.6929 21.6501 15.8077 21.1538L14.3463 20.8158ZM19.0274 18.015C19.0366 18.0043 19.0403 18.0098 19.0132 18.0162C18.9818 18.0235 18.9275 18.0261 18.8603 18.0102L18.5159 19.4702C19.0115 19.587 19.7035 19.5314 20.1665 18.991L19.0274 18.015ZM20.7356 8.95008C20.7302 8.93479 20.739 8.93343 20.7271 8.96395C20.7129 9.00025 20.6775 9.05453 20.6166 9.10469L21.5704 10.2624C22.0056 9.90381 22.4178 9.21767 22.1517 8.45569L20.7356 8.95008ZM3.26434 15.0499C3.26968 15.0652 3.26089 15.0666 3.27283 15.0361C3.28703 14.9998 3.32242 14.9455 3.3833 14.8953L2.42947 13.7376C1.9943 14.0962 1.58215 14.7823 1.84816 15.5443L3.26434 15.0499ZM18.8601 5.98949C18.9273 5.97364 18.9815 5.97624 19.013 5.98357C19.04 5.98987 19.0363 5.99537 19.0272 5.98471L20.1662 5.00871C19.7032 4.46835 19.0114 4.41269 18.5158 4.52952L18.8601 5.98949ZM4.97273 5.98468C4.9636 5.99534 4.95988 5.98984 4.98693 5.98354C5.01839 5.97621 5.07265 5.97361 5.13988 5.98946L5.48414 4.5295C4.98861 4.41265 4.29672 4.4683 3.83369 5.00867L4.97273 5.98468ZM20.6166 14.8953C20.6775 14.9455 20.7129 14.9997 20.7271 15.036C20.739 15.0666 20.7302 15.0652 20.7356 15.0499L22.1517 15.5443C22.4178 14.7823 22.0056 14.0962 21.5704 13.7376L20.6166 14.8953ZM15.8078 2.84603C15.693 2.34983 15.3361 1.75292 14.6449 1.578L14.2769 3.03217C14.2631 3.02866 14.2662 3.02273 14.2838 3.04417C14.3044 3.06913 14.3308 3.11672 14.3464 3.18418L15.8078 2.84603Z"
          fill="currentColor"
        />
      </svg>
    );
  },

  VolumeDown: (props: JSX.IntrinsicElements["svg"]) => {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path
          d="M15 6.3706C15 4.65827 12.9884 3.73774 11.6926 4.85712L8.36317 7.73321C7.99988 8.04704 7.53583 8.21972 7.05576 8.21973L5.49998 8.21974C4.11928 8.21975 3 9.33903 3 10.7197V14.0127C3 15.3934 4.11929 16.5127 5.5 16.5127H7.0558C7.53587 16.5127 7.99993 16.6854 8.36322 16.9992L11.6926 19.8753C12.9884 20.9947 15 20.0741 15 18.3618V12.3662V6.3706Z"
          stroke="currentColor"
          stroke-width="1.5"
        />
        <path
          d="M18 15.3667C18.6279 14.531 19 13.4923 19 12.3667C19 11.2411 18.6279 10.2024 18 9.3667"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
      </svg>
    );
  },
};

export const Filled = {
  Browser: (props: JSX.IntrinsicElements["svg"]) => {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path
          d="M1.25 7.75V17C1.25 20.1756 3.82436 22.75 7 22.75H17C20.1756 22.75 22.75 20.1756 22.75 17V7.75H1.25Z"
          fill="currentColor"
        />
        <path
          opacity="0.3"
          d="M1.29834 6.25C1.66585 3.42873 4.07842 1.25 6.99987 1.25H16.9999C19.9213 1.25 22.3339 3.42873 22.7014 6.25H1.29834Z"
          fill="currentColor"
        />
      </svg>
    );
  },

  Basketball: (props: JSX.IntrinsicElements["svg"]) => {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <rect opacity="0.3" x="1.99985" y="1.99985" width="20" height="20" rx="10" fill="currentColor" />
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M2.02743 11.2497H7.21845C7.03183 9.02184 6.02103 7.02123 4.48007 5.54052L5.51938 4.45893C7.34029 6.20865 8.5328 8.59288 8.72298 11.2497H11.2497V2.02743C11.4973 2.00907 11.7474 1.99973 11.9997 1.99973C12.252 1.99973 12.5021 2.00907 12.7497 2.02743V11.2497H15.2755C15.4611 8.5572 16.6388 6.13664 18.444 4.35277C18.6371 4.51565 18.8239 4.6857 19.004 4.86253L19.2756 5.13953C19.357 5.22589 19.437 5.31371 19.5154 5.40293C17.9744 6.91784 16.9627 8.96647 16.7797 11.2497H21.972C21.9904 11.4973 21.9997 11.7474 21.9997 11.9997C21.9997 12.252 21.9904 12.5021 21.972 12.7497H16.7797C16.9628 15.0329 17.9745 17.0815 19.5155 18.5963C19.4397 18.6826 19.3625 18.7676 19.2838 18.8512L18.9955 19.1453C18.818 19.3191 18.6341 19.4863 18.4442 19.6465C16.6389 17.8627 15.4612 15.4422 15.2755 12.7497H12.7497V21.972C12.5021 21.9904 12.252 21.9997 11.9997 21.9997C11.7474 21.9997 11.4973 21.9904 11.2497 21.972V12.7497H8.72298C8.5328 15.4066 7.34029 17.7908 5.51938 19.5405L4.48007 18.4589C6.02103 16.9782 7.03183 14.9776 7.21845 12.7497H2.02743C2.00907 12.5021 1.99973 12.252 1.99973 11.9997C1.99973 11.7474 2.00907 11.4973 2.02743 11.2497Z"
          fill="currentColor"
        />
      </svg>
    );
  },

  Category2: (props: JSX.IntrinsicElements["svg"]) => {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <rect x="4" y="4" width="7" height="4" rx="2" fill="currentColor" />
        <rect x="4" y="11" width="7" height="10" rx="2.5" fill="currentColor" />
        <rect opacity="0.3" x="14" y="4" width="7" height="10" rx="2.5" fill="currentColor" />
        <rect x="14" y="17" width="7" height="4" rx="2" fill="currentColor" />
      </svg>
    );
  },

  Box2: (props: JSX.IntrinsicElements["svg"]) => {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path
          d="M2.00024 17.1668C2.00024 17.5705 2.24298 17.9346 2.61563 18.0899L11.2501 21.6876V10.83L6.20939 8.69134L2.00024 6.93753V17.1668Z"
          fill="currentColor"
        />
        <path
          d="M22.0002 6.75856L12.7501 10.8231V21.6877L21.3849 18.0899C21.7575 17.9346 22.0002 17.5705 22.0002 17.1668V6.75856Z"
          fill="currentColor"
        />
        <g opacity="0.3">
          <path
            d="M3.02563 5.73969L6.49411 7.18488L15.278 3.36581L12.7697 2.32069C12.2774 2.11556 11.7235 2.11556 11.2312 2.32069L3.02563 5.73969Z"
            fill="currentColor"
          />
          <path
            d="M17.199 4.16623L8.40074 7.99156L11.9951 9.51656L20.7778 5.65739L17.199 4.16623Z"
            fill="currentColor"
          />
        </g>
      </svg>
    );
  },

  Heart: (props: JSX.IntrinsicElements["svg"]) => {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path
          d="M12 4.00021C9.47336 1.59045 5.55446 1.66908 3.11869 4.23612C0.627102 6.86197 0.627103 11.1038 3.11869 13.7297L9.27971 20.2227C10.0191 21.0019 11.0095 21.3915 12 21.3915V4.00021Z"
          fill="currentColor"
        />
        <path
          opacity="0.3"
          d="M12 4.00021C14.5266 1.59045 18.4455 1.66908 20.8813 4.23612C23.3729 6.86197 23.3729 11.1038 20.8813 13.7297L14.7203 20.2227C13.9809 21.0019 12.9905 21.3915 12 21.3915V4.00021Z"
          fill="currentColor"
        />
      </svg>
    );
  },

  Layers: (props: JSX.IntrinsicElements["svg"]) => {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path
          d="M14.6198 1.93606C12.9917 1.02131 11.0083 1.02131 9.38018 1.93606L3.34356 5.32762C1.88548 6.14682 1.88548 8.25428 3.34356 9.07348L9.38018 12.465C11.0083 13.3798 12.9917 13.3798 14.6198 12.465L20.6564 9.07348C22.1145 8.25428 22.1145 6.14682 20.6564 5.32762L14.6198 1.93606Z"
          fill="currentColor"
        />
        <path
          opacity="0.3"
          d="M2.97517 15.3369C1.89805 16.2769 2.02084 18.0802 3.34356 18.8234L9.38018 22.2149C11.0083 23.1297 12.9917 23.1297 14.6198 22.2149L20.6564 18.8234C21.9792 18.0802 22.102 16.2769 21.0248 15.3369L15.3545 18.5227C13.2701 19.6938 10.7299 19.6938 8.64545 18.5227L2.97517 15.3369Z"
          fill="currentColor"
        />
        <path
          opacity="0.3"
          d="M2.97517 10.5C1.89805 11.44 2.02084 13.2433 3.34356 13.9864L9.38018 17.378C11.0083 18.2928 12.9917 18.2928 14.6198 17.378L20.6564 13.9864C21.9792 13.2433 22.102 11.44 21.0248 10.5L15.3545 13.6857C13.2701 14.8568 10.7299 14.8568 8.64545 13.6857L2.97517 10.5Z"
          fill="currentColor"
        />
      </svg>
    );
  },

  Gamepad: (props: JSX.IntrinsicElements["svg"]) => {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path
          opacity="0.3"
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M7.57215 4.27907C4.1872 3.94057 1.25 6.59871 1.25 10.0005V15.9412C1.25 20.5049 7.12464 22.3567 9.74178 18.618L10.026 18.2119C11.1877 16.5524 13.6641 16.6095 14.7479 18.3209C17.0724 21.9911 22.75 20.3445 22.75 16V10.0005C22.75 6.5987 19.8128 3.94057 16.4279 4.27907L12.5224 4.66961C12.175 4.70435 11.825 4.70435 11.4776 4.66961L7.57215 4.27907Z"
          fill="currentColor"
        />
        <circle cx="18" cy="9.97556" r="1" fill="currentColor" />
        <circle cx="16" cy="12.9756" r="1" fill="currentColor" />
        <path
          d="M8 13.4756L8 9.47556"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M6 11.4756H10"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    );
  },

  User: (props: JSX.IntrinsicElements["svg"]) => {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <circle
          opacity="0.3"
          cx="4"
          cy="4"
          r="4"
          transform="matrix(-1 0 0 1 16 3)"
          fill="currentColor"
          stroke="currentColor"
          stroke-width="1.5"
        />
        <path
          d="M5 16.9347C5 16.0743 5.54085 15.3068 6.35109 15.0175C10.004 13.7128 13.996 13.7128 17.6489 15.0175C18.4591 15.3068 19 16.0743 19 16.9347V18.2502C19 19.4376 17.9483 20.3498 16.7728 20.1818L15.8184 20.0455C13.2856 19.6837 10.7144 19.6837 8.18162 20.0455L7.22721 20.1818C6.0517 20.3498 5 19.4376 5 18.2502V16.9347Z"
          fill="currentColor"
          stroke="currentColor"
          stroke-width="1.5"
        />
      </svg>
    );
  },
};

export const ElementWater = (props: JSX.IntrinsicElements["svg"]) => {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M36.0001 70.8236C55.2326 70.8236 70.8236 55.2325 70.8236 36C70.8236 16.7675 55.2326 1.17651 36.0001 1.17651C16.7675 1.17651 1.17651 16.7675 1.17651 36C1.17651 55.2325 16.7675 70.8236 36.0001 70.8236Z"
        fill="url(#paint0_radial_741_5461)"
      />
      <g opacity="0.1">
        <mask id="mask0_741_5461" maskUnits="userSpaceOnUse" x="1" y="1" width="70" height="70">
          <path
            d="M36.0001 70.8236C55.2326 70.8236 70.8236 55.2325 70.8236 36C70.8236 16.7675 55.2326 1.17651 36.0001 1.17651C16.7675 1.17651 1.17651 16.7675 1.17651 36C1.17651 55.2325 16.7675 70.8236 36.0001 70.8236Z"
            fill="white"
          />
        </mask>
        <g mask="url(#mask0_741_5461)">
          <path
            d="M89.8087 25.3529C88.5881 36.9705 85.0587 48.4999 78.4852 58.1617C71.9116 67.8235 62.1175 75.4999 50.794 78.397C38.6469 81.5147 25.4999 78.9558 14.4116 73.1176C3.3234 67.2794 -5.88248 58.3529 -13.706 48.5441C-14.5884 47.4264 -15.5148 46.1911 -15.5295 44.7647C-3.77954 44.2647 7.67633 40.6029 18.2646 35.4705C28.8528 30.3382 38.6616 23.7499 48.3234 17.0441C44.8675 26.3823 39.5146 35.0147 32.6763 42.2647C52.2499 37.6323 69.3969 23.6911 77.9263 5.48523L89.8087 25.3529Z"
            fill="#1A1A1A"
          />
        </g>
      </g>
      <path
        d="M36.0001 3.57352C54.8236 3.57352 70.1618 18.5294 70.7942 37.2059C70.8089 36.8088 70.8236 36.4118 70.8236 36.0147C70.8236 16.7794 55.2353 1.19116 36.0001 1.19116C16.7648 1.19116 1.17651 16.7794 1.17651 36.0147C1.17651 36.4118 1.19121 36.8088 1.20592 37.2059C1.83827 18.5147 17.1618 3.57352 36.0001 3.57352Z"
        fill="white"
      />
      <path
        d="M36.0001 69.6765C16.9265 69.6765 1.44122 54.3382 1.19122 35.3088C1.19122 35.5294 1.17651 35.7647 1.17651 35.9853C1.17651 55.2206 16.7648 70.8088 36.0001 70.8088C55.2353 70.8088 70.8236 55.2206 70.8236 35.9853C70.8236 35.7647 70.8236 35.5294 70.8089 35.3088C70.5589 54.3382 55.0736 69.6765 36.0001 69.6765Z"
        fill="white"
      />
      <path
        d="M28.3236 37.25C29.0736 38.3971 29.9559 39.4559 30.8677 40.4853C32.0295 38.6177 34.0883 37.3677 36.4412 37.3677C38.7795 37.3677 40.8383 38.603 42 40.4559C42.9118 39.4412 43.7795 38.3971 44.5295 37.25C45.2353 36.1618 45.8236 34.9853 46.1765 33.75L36.4265 13.4265L26.6765 33.75C27.0295 34.9853 27.6177 36.1618 28.3236 37.25ZM36.4412 27.8383C38.0736 27.8383 39.4118 29.1618 39.4118 30.8089C39.4118 32.4412 38.0883 33.7795 36.4412 33.7795C34.7942 33.7795 33.4706 32.4559 33.4706 30.8089C33.4706 29.1618 34.8089 27.8383 36.4412 27.8383Z"
        fill="white"
      />
      <path
        d="M48.3382 38.2794L48.2206 38.0294C48.1912 38.1471 48.1471 38.2647 48.1029 38.3824C47.6029 39.6912 46.6765 40.4118 46.0588 40.8824C44.9853 41.7059 43.8235 42.1471 42.8088 42.3971C42.9265 42.8824 43 43.3971 43 43.9265C43 47.5441 40.0588 50.4853 36.4412 50.4853C32.8235 50.4853 29.8824 47.5441 29.8824 43.9265C29.8824 43.3971 29.9559 42.8971 30.0735 42.3971C29.0441 42.1471 27.8676 41.7059 26.7941 40.8824C26.1765 40.4118 25.25 39.6912 24.75 38.3824C24.7059 38.2647 24.6618 38.1471 24.6324 38.0294L24.5147 38.2794C22.0882 43.3382 23.1176 49.3677 27.0882 53.3382C32.25 58.5 40.6177 58.5 45.7794 53.3382C49.7353 49.3824 50.7647 43.3382 48.3382 38.2794Z"
        fill="white"
      />
      <path
        opacity="0.1"
        d="M36 54.0147C19.6618 54.0147 5.97063 42.7647 2.20593 27.6029C1.54416 30.2941 1.17651 33.1029 1.17651 36.0147C1.17651 55.25 16.7647 70.8382 36 70.8382C55.2353 70.8382 70.8236 55.25 70.8236 36.0147C70.8236 33.1176 70.4706 30.2941 69.7942 27.6029C66.0295 42.7647 52.3383 54.0147 36 54.0147Z"
        fill="#1A1A1A"
      />
      <path
        opacity="0.5"
        d="M20.7362 22.805C24.159 19.3822 25.3136 14.9873 23.315 12.9888C21.3165 10.9902 16.9216 12.1448 13.4988 15.5676C10.076 18.9904 8.92142 23.3853 10.92 25.3838C12.9185 27.3824 17.3134 26.2278 20.7362 22.805Z"
        fill="white"
      />
      <path
        opacity="0.5"
        d="M31.0441 14.4117C33.1396 14.4117 34.8382 12.713 34.8382 10.6176C34.8382 8.52216 33.1396 6.82349 31.0441 6.82349C28.9487 6.82349 27.25 8.52216 27.25 10.6176C27.25 12.713 28.9487 14.4117 31.0441 14.4117Z"
        fill="white"
      />
      <path
        opacity="0.5"
        d="M56.5294 57.5147C55.1764 58.7353 54.5 60.1912 55 60.75C55.5 61.3088 57.0147 60.7647 58.3676 59.5441C59.7206 58.3235 60.397 56.8677 59.897 56.3088C59.397 55.75 57.8823 56.2941 56.5294 57.5147Z"
        fill="white"
      />
      <path
        opacity="0.5"
        d="M61.2941 53.9852C60.7352 54.4852 60.5735 55.2205 60.9264 55.6176C61.2794 56.0146 62.0294 55.9264 62.5882 55.4117C63.147 54.9117 63.3088 54.1764 62.9558 53.7793C62.5882 53.397 61.8529 53.4852 61.2941 53.9852Z"
        fill="white"
      />
      <circle cx="36" cy="36" r="35" stroke="#2F1A49" stroke-width="2" />
      <defs>
        <radialGradient
          id="paint0_radial_741_5461"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(35.9952 35.9994) scale(34.8214)"
        >
          <stop stop-color="#004AAD" />
          <stop offset="0.2746" stop-color="#024DAE" />
          <stop offset="0.4397" stop-color="#0A55B3" />
          <stop offset="0.5759" stop-color="#1663BC" />
          <stop offset="0.6964" stop-color="#2877C8" />
          <stop offset="0.8064" stop-color="#3F92D7" />
          <stop offset="0.9074" stop-color="#5AB2EA" />
          <stop offset="1" stop-color="#7AD6FF" />
        </radialGradient>
      </defs>
    </svg>
  );
};

export const ElementFire = (props: JSX.IntrinsicElements["svg"]) => {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M36 70.8236C55.2325 70.8236 70.8236 55.2325 70.8236 36C70.8236 16.7675 55.2325 1.17651 36 1.17651C16.7675 1.17651 1.17651 16.7675 1.17651 36C1.17651 55.2325 16.7675 70.8236 36 70.8236Z"
        fill="url(#paint0_radial_741_5415)"
      />
      <g opacity="0.1">
        <mask id="mask0_741_5415" maskUnits="userSpaceOnUse" x="1" y="1" width="70" height="70">
          <path
            d="M36 70.8236C55.2325 70.8236 70.8236 55.2325 70.8236 36C70.8236 16.7675 55.2325 1.17651 36 1.17651C16.7675 1.17651 1.17651 16.7675 1.17651 36C1.17651 55.2325 16.7675 70.8236 36 70.8236Z"
            fill="white"
          />
        </mask>
        <g mask="url(#mask0_741_5415)">
          <path
            d="M89.8088 25.3529C88.5882 36.9705 85.0588 48.4999 78.4853 58.1617C71.9118 67.8235 62.1176 75.4999 50.7941 78.397C38.6471 81.5146 25.5 78.9558 14.4118 73.1176C3.32352 67.2793 -5.88236 58.3529 -13.7059 48.544C-14.5882 47.4264 -15.5147 46.1911 -15.5294 44.7646C-3.77942 44.2646 7.67646 40.6029 18.2647 35.4705C28.8529 30.3382 38.6618 23.7499 48.3235 17.0441C44.8676 26.3823 39.5147 35.0146 32.6765 42.2646C52.25 37.6323 69.3971 23.6911 77.9265 5.48523L89.8088 25.3529Z"
            fill="#1A1A1A"
          />
        </g>
      </g>
      <path
        d="M36 3.57352C54.8236 3.57352 70.1618 18.5294 70.7942 37.2059C70.8089 36.8088 70.8236 36.4118 70.8236 36.0147C70.8236 16.7794 55.2353 1.19116 36 1.19116C16.7647 1.19116 1.17651 16.7794 1.17651 36.0147C1.17651 36.4118 1.19122 36.8088 1.20593 37.2059C1.83828 18.5147 17.1618 3.57352 36 3.57352Z"
        fill="white"
      />
      <path
        d="M36 69.6765C16.9265 69.6765 1.44122 54.3382 1.19122 35.3088C1.19122 35.5294 1.17651 35.7647 1.17651 35.9853C1.17651 55.2206 16.7647 70.8088 36 70.8088C55.2353 70.8088 70.8236 55.2206 70.8236 35.9853C70.8236 35.7647 70.8236 35.5294 70.8089 35.3088C70.5589 54.3382 55.0736 69.6765 36 69.6765Z"
        fill="white"
      />
      <path
        d="M30.7648 53.9854C30.7648 53.9854 25.0589 51.8236 21.8383 48.7648C20.1472 47.1618 18.2354 44.4412 17.4119 39.5883C19.6472 41.2354 22.2648 42.3677 24.9854 42.8971C21.1619 40.1912 19.9854 34.8089 21.0295 30.2207C22.0736 25.6471 24.8972 21.7059 27.7942 18.0148C27.3972 23.1177 30.4413 27.7648 33.4119 31.9265C33.5295 32.0883 33.6472 32.2501 33.6619 32.4559C33.6766 32.6912 33.5442 32.8971 33.4119 33.103C30.6177 37.4265 31.1472 43.603 34.6325 47.3824C34.6619 47.4118 34.8236 47.5442 34.853 47.7501C34.8677 47.8971 34.7942 48.0001 34.7648 48.0442C34.4266 48.6324 30.7648 53.9854 30.7648 53.9854Z"
        fill="white"
      />
      <path
        d="M41.2354 53.9854C41.2354 53.9854 46.9413 51.8236 50.1619 48.7648C51.8531 47.1618 53.7648 44.4412 54.5884 39.5883C52.3531 41.2354 49.7354 42.3677 47.0148 42.8971C50.8384 40.1912 52.0148 34.8089 50.9707 30.2207C49.9266 25.6471 47.1031 21.7059 44.206 18.0148C44.6031 23.1177 41.559 27.7648 38.5884 31.9265C38.4707 32.0883 38.3531 32.2501 38.3384 32.4559C38.3237 32.6912 38.456 32.8971 38.5884 33.103C41.3825 37.4265 40.8531 43.603 37.3678 47.3824C37.3384 47.4118 37.1766 47.5442 37.1472 47.7501C37.1325 47.8971 37.206 48.0001 37.2354 48.0442C37.5737 48.6324 41.2354 53.9854 41.2354 53.9854Z"
        fill="white"
      />
      <path
        opacity="0.1"
        d="M36 54.0147C19.6618 54.0147 5.97063 42.7647 2.20593 27.6029C1.54416 30.2941 1.17651 33.1029 1.17651 36.0147C1.17651 55.25 16.7647 70.8382 36 70.8382C55.2353 70.8382 70.8236 55.25 70.8236 36.0147C70.8236 33.1176 70.4706 30.2941 69.7942 27.6029C66.0295 42.7647 52.3383 54.0147 36 54.0147Z"
        fill="#1A1A1A"
      />
      <path
        opacity="0.5"
        d="M20.7362 22.805C24.159 19.3822 25.3136 14.9873 23.315 12.9888C21.3165 10.9902 16.9216 12.1448 13.4988 15.5676C10.076 18.9904 8.92142 23.3853 10.92 25.3838C12.9185 27.3824 17.3134 26.2278 20.7362 22.805Z"
        fill="white"
      />
      <path
        opacity="0.5"
        d="M31.0441 14.4117C33.1396 14.4117 34.8382 12.713 34.8382 10.6176C34.8382 8.52216 33.1396 6.82349 31.0441 6.82349C28.9487 6.82349 27.25 8.52216 27.25 10.6176C27.25 12.713 28.9487 14.4117 31.0441 14.4117Z"
        fill="white"
      />
      <path
        opacity="0.5"
        d="M56.5294 57.5147C55.1764 58.7353 54.5 60.1912 55 60.75C55.5 61.3088 57.0147 60.7647 58.3676 59.5441C59.7206 58.3235 60.397 56.8677 59.897 56.3088C59.397 55.75 57.8823 56.2941 56.5294 57.5147Z"
        fill="white"
      />
      <path
        opacity="0.5"
        d="M61.2941 53.9852C60.7352 54.4852 60.5735 55.2205 60.9264 55.6176C61.2794 56.0146 62.0294 55.9264 62.5882 55.4117C63.147 54.9117 63.3088 54.1764 62.9558 53.7793C62.5882 53.397 61.8529 53.4852 61.2941 53.9852Z"
        fill="white"
      />
      <circle cx="36" cy="36" r="35" stroke="#2F1A49" stroke-width="2" />
      <defs>
        <radialGradient
          id="paint0_radial_741_5415"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(35.9995 35.9994) scale(34.8214 34.8214)"
        >
          <stop stop-color="#921D00" />
          <stop offset="0.2976" stop-color="#951F02" />
          <stop offset="0.4767" stop-color="#9D250B" />
          <stop offset="0.6243" stop-color="#AB2F18" />
          <stop offset="0.7548" stop-color="#BF3D2C" />
          <stop offset="0.874" stop-color="#DA4F45" />
          <stop offset="0.9836" stop-color="#FA6564" />
          <stop offset="1" stop-color="#FF6969" />
        </radialGradient>
      </defs>
    </svg>
  );
};

export const ElementEarth = (props: JSX.IntrinsicElements["svg"]) => {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M36 70.8236C55.2325 70.8236 70.8236 55.2326 70.8236 36.0001C70.8236 16.7675 55.2325 1.17651 36 1.17651C16.7675 1.17651 1.17651 16.7675 1.17651 36.0001C1.17651 55.2326 16.7675 70.8236 36 70.8236Z"
        fill="url(#paint0_radial_741_5499)"
      />
      <g opacity="0.1">
        <mask id="mask0_741_5499" maskUnits="userSpaceOnUse" x="1" y="1" width="70" height="70">
          <path
            d="M36 70.8236C55.2325 70.8236 70.8236 55.2326 70.8236 36.0001C70.8236 16.7675 55.2325 1.17651 36 1.17651C16.7675 1.17651 1.17651 16.7675 1.17651 36.0001C1.17651 55.2326 16.7675 70.8236 36 70.8236Z"
            fill="white"
          />
        </mask>
        <g mask="url(#mask0_741_5499)">
          <path
            d="M89.8089 25.353C88.5883 36.9706 85.0589 48.5001 78.4854 58.1618C71.9119 67.8236 62.1178 75.5001 50.7942 78.3971C38.6472 81.5148 25.5001 78.9559 14.4119 73.1177C3.32364 67.2795 -5.88224 58.353 -13.7058 48.5442C-14.5881 47.4265 -15.5146 46.1912 -15.5293 44.7648C-3.7793 44.2648 7.67658 40.603 18.2648 35.4706C28.8531 30.3383 38.6619 23.7501 48.3236 17.0442C44.8678 26.3824 39.5148 35.0148 32.6766 42.2648C52.2501 37.6324 69.3972 23.6912 77.9266 5.48535L89.8089 25.353Z"
            fill="#1A1A1A"
          />
        </g>
      </g>
      <path
        d="M36 3.57365C54.8236 3.57365 70.1618 18.5295 70.7942 37.206C70.8089 36.8089 70.8236 36.4119 70.8236 36.0148C70.8236 16.7795 55.2353 1.19128 36 1.19128C16.7647 1.19128 1.17651 16.7795 1.17651 36.0148C1.17651 36.4119 1.19122 36.8089 1.20593 37.206C1.83828 18.5148 17.1765 3.57365 36 3.57365Z"
        fill="white"
      />
      <path
        d="M36 69.6765C16.9265 69.6765 1.44122 54.3382 1.19122 35.3088C1.19122 35.5294 1.17651 35.7647 1.17651 35.9853C1.17651 55.2206 16.7647 70.8088 36 70.8088C55.2353 70.8088 70.8236 55.2206 70.8236 35.9853C70.8236 35.7647 70.8236 35.5294 70.8089 35.3088C70.5736 54.3382 55.0883 69.6765 36 69.6765Z"
        fill="white"
      />
      <path
        d="M34.4412 44.6324L28.0147 40.9265V31.7059L34.4412 28.0001V16.9265L18.4412 26.1618V46.4559L34.4412 55.6912V44.6324Z"
        fill="white"
      />
      <path
        d="M37.5735 16.9265V28.0001L43.9852 31.7059V40.9265L37.5735 44.6324V55.6912L53.5735 46.4559V26.1618L37.5735 16.9265Z"
        fill="white"
      />
      <path
        opacity="0.1"
        d="M36 54.0147C19.6618 54.0147 5.97063 42.7647 2.20593 27.6029C1.54416 30.2941 1.17651 33.1029 1.17651 36.0147C1.17651 55.25 16.7647 70.8382 36 70.8382C55.2353 70.8382 70.8236 55.25 70.8236 36.0147C70.8236 33.1176 70.4706 30.2941 69.7942 27.6029C66.0295 42.7647 52.3383 54.0147 36 54.0147Z"
        fill="#1A1A1A"
      />
      <path
        opacity="0.5"
        d="M20.7362 22.805C24.159 19.3822 25.3136 14.9873 23.315 12.9888C21.3165 10.9902 16.9216 12.1448 13.4988 15.5676C10.076 18.9904 8.92142 23.3853 10.92 25.3838C12.9185 27.3824 17.3134 26.2278 20.7362 22.805Z"
        fill="white"
      />
      <path
        opacity="0.5"
        d="M31.0441 14.4117C33.1396 14.4117 34.8382 12.713 34.8382 10.6176C34.8382 8.52216 33.1396 6.82349 31.0441 6.82349C28.9487 6.82349 27.25 8.52216 27.25 10.6176C27.25 12.713 28.9487 14.4117 31.0441 14.4117Z"
        fill="white"
      />
      <path
        opacity="0.5"
        d="M56.5294 57.5147C55.1764 58.7353 54.5 60.1912 55 60.75C55.5 61.3088 57.0147 60.7647 58.3676 59.5441C59.7206 58.3235 60.397 56.8677 59.897 56.3088C59.397 55.75 57.8823 56.2941 56.5294 57.5147Z"
        fill="white"
      />
      <path
        opacity="0.5"
        d="M61.2941 53.9852C60.7352 54.4852 60.5735 55.2205 60.9264 55.6176C61.2794 56.0146 62.0294 55.9264 62.5882 55.4117C63.147 54.9117 63.3088 54.1764 62.9558 53.7793C62.5882 53.397 61.8529 53.4852 61.2941 53.9852Z"
        fill="white"
      />
      <circle cx="36" cy="36" r="35" stroke="#2F1A49" stroke-width="2" />
      <defs>
        <radialGradient
          id="paint0_radial_741_5499"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(36.0047 36.0009) scale(34.8214)"
        >
          <stop stop-color="#63433B" />
          <stop offset="0.2652" stop-color="#66453D" />
          <stop offset="0.4247" stop-color="#6E4E42" />
          <stop offset="0.5562" stop-color="#7C5C4B" />
          <stop offset="0.6726" stop-color="#916F57" />
          <stop offset="0.779" stop-color="#AB8968" />
          <stop offset="0.878" stop-color="#CBA87C" />
          <stop offset="0.9695" stop-color="#F1CD93" />
          <stop offset="1" stop-color="#FFDB9C" />
        </radialGradient>
      </defs>
    </svg>
  );
};

export const ElementWind = (props: JSX.IntrinsicElements["svg"]) => {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M36 70.8236C55.2325 70.8236 70.8236 55.2326 70.8236 36C70.8236 16.7675 55.2325 1.17651 36 1.17651C16.7675 1.17651 1.17651 16.7675 1.17651 36C1.17651 55.2326 16.7675 70.8236 36 70.8236Z"
        fill="url(#paint0_radial_741_5481)"
      />
      <g opacity="0.1">
        <mask id="mask0_741_5481" maskUnits="userSpaceOnUse" x="1" y="1" width="70" height="70">
          <path
            d="M36 70.8236C55.2325 70.8236 70.8236 55.2326 70.8236 36C70.8236 16.7675 55.2325 1.17651 36 1.17651C16.7675 1.17651 1.17651 16.7675 1.17651 36C1.17651 55.2326 16.7675 70.8236 36 70.8236Z"
            fill="white"
          />
        </mask>
        <g mask="url(#mask0_741_5481)">
          <path
            d="M89.8088 25.353C88.5882 36.9706 85.0588 48.5 78.4853 58.1618C71.9118 67.8236 62.1176 75.5 50.7941 78.3971C38.6471 81.5147 25.5 78.9559 14.4118 73.1177C3.32352 67.2795 -5.88236 58.353 -13.7059 48.5442C-14.5882 47.4265 -15.5147 46.1912 -15.5294 44.7648C-3.77942 44.2648 7.67646 40.603 18.2647 35.4706C28.8529 30.3383 38.6618 23.7501 48.3235 17.0442C44.8676 26.3824 39.5147 35.0148 32.6765 42.2648C52.25 37.6324 69.3971 23.6912 77.9265 5.48535L89.8088 25.353Z"
            fill="#1A1A1A"
          />
        </g>
      </g>
      <path
        d="M36 3.57353C54.8236 3.57353 70.1618 18.5294 70.7942 37.2059C70.8089 36.8088 70.8236 36.4118 70.8236 36.0147C70.8236 16.7794 55.2353 1.19116 36 1.19116C16.7647 1.19116 1.17651 16.7794 1.17651 36.0147C1.17651 36.4118 1.19122 36.8088 1.20593 37.2059C1.83828 18.5147 17.1618 3.57353 36 3.57353Z"
        fill="white"
      />
      <path
        d="M36 69.6765C16.9265 69.6765 1.44122 54.3382 1.19122 35.3088C1.19122 35.5294 1.17651 35.7647 1.17651 35.9853C1.17651 55.2206 16.7647 70.8088 36 70.8088C55.2353 70.8088 70.8236 55.2206 70.8236 35.9853C70.8236 35.7647 70.8236 35.5294 70.8089 35.3088C70.5589 54.3382 55.0736 69.6765 36 69.6765Z"
        fill="white"
      />
      <path
        opacity="0.1"
        d="M36 54.0147C19.6618 54.0147 5.97063 42.7647 2.20593 27.6029C1.54416 30.2941 1.17651 33.1029 1.17651 36.0147C1.17651 55.25 16.7647 70.8382 36 70.8382C55.2353 70.8382 70.8236 55.25 70.8236 36.0147C70.8236 33.1176 70.4706 30.2941 69.7942 27.6029C66.0295 42.7647 52.3383 54.0147 36 54.0147Z"
        fill="#1A1A1A"
      />
      <path
        opacity="0.5"
        d="M20.7362 22.805C24.159 19.3822 25.3136 14.9873 23.315 12.9888C21.3165 10.9902 16.9216 12.1448 13.4988 15.5676C10.076 18.9904 8.92142 23.3853 10.92 25.3838C12.9185 27.3824 17.3134 26.2278 20.7362 22.805Z"
        fill="white"
      />
      <path
        opacity="0.5"
        d="M31.0441 14.4117C33.1396 14.4117 34.8382 12.713 34.8382 10.6176C34.8382 8.52216 33.1396 6.82349 31.0441 6.82349C28.9487 6.82349 27.25 8.52216 27.25 10.6176C27.25 12.713 28.9487 14.4117 31.0441 14.4117Z"
        fill="white"
      />
      <path
        opacity="0.5"
        d="M56.5294 57.5147C55.1764 58.7353 54.5 60.1912 55 60.75C55.5 61.3088 57.0147 60.7647 58.3676 59.5441C59.7206 58.3235 60.397 56.8677 59.897 56.3088C59.397 55.75 57.8823 56.2941 56.5294 57.5147Z"
        fill="white"
      />
      <path
        opacity="0.5"
        d="M61.2941 53.9852C60.7352 54.4852 60.5735 55.2205 60.9264 55.6176C61.2794 56.0146 62.0294 55.9264 62.5882 55.4117C63.147 54.9117 63.3088 54.1764 62.9558 53.7793C62.5882 53.397 61.8529 53.4852 61.2941 53.9852Z"
        fill="white"
      />
      <path
        d="M50.2795 31.4265C47.3383 33.6765 44.0442 35.4706 40.5736 36.75C40.5883 36.5736 40.5883 36.3824 40.603 36.1912C42.5589 35.353 44.3089 34.0442 45.5736 32.3383C47.9706 29.0736 48.3677 24.3383 46.1765 20.9412C44.25 24.5589 41.7059 27.853 38.7206 30.6471C38.5883 30.5 38.4559 30.353 38.3236 30.2059C40.1618 28.4412 41.5 26.1618 41.9559 23.6618C42.6912 19.6765 40.9706 15.25 37.5148 13.1471C37.3383 18.2059 36.0883 23.2206 33.8971 27.7941C33.3971 27.6912 32.8677 27.6471 32.3383 27.6471C27.7648 27.6471 24.0589 31.353 24.0589 35.9265C24.0589 37.25 24.3824 38.5 24.9412 39.6177C23.9706 39.7942 23.0736 40.1471 22.4265 40.8677C21.3383 42.0736 21.3824 44.1471 22.5442 45.3089C23.2648 46.0294 24.2942 46.3677 25.3089 46.5294C26.5442 46.7353 27.8089 46.7353 29.0589 46.7206C31.9559 46.7059 34.853 46.6912 37.75 46.6765C38.853 46.6765 40 46.6765 40.9853 47.1765C41.9706 47.6765 42.7059 48.8236 42.3677 49.8677C42.0295 50.8971 40.853 51.3677 39.8089 51.603C35.1618 52.6324 30.9706 52.1765 29.7206 53.6324C29.2501 54.1765 29.103 54.7941 29.103 54.7941C29.103 54.7941 28.9118 55.5883 29.2206 56.3677C29.6618 57.5147 30.9853 57.9853 31.9559 58.3236C34.9412 59.3383 37.7795 58.6177 37.7795 58.4118C37.7795 58.2794 36.6765 58.4559 35.5 57.7059C35.1324 57.4706 34.2353 56.8971 34.103 55.8824C34 55.0589 34.4559 54.4118 34.5295 54.3089C35.1324 53.4706 36.1471 53.3236 37.6177 53.0883C40.5736 52.6324 42.0442 52.3971 42.3824 52.3088C44.1912 51.8383 45.7648 51.4118 46.6912 50C47.3089 49.0589 47.4853 47.8383 47.1618 46.7647C46.7206 45.2647 45.3971 44.1618 43.9559 43.5736C43 43.1912 41.9706 43 40.9412 42.8824C42.353 42.6912 43.7353 42.25 45 41.5589C48.5295 39.5736 50.853 35.4265 50.2795 31.4265ZM32.3383 39.853C30.1765 39.853 28.4118 38.103 28.4118 35.9265C28.4118 33.7647 30.1618 32 32.3383 32C34.5148 32 36.2648 33.75 36.2648 35.9265C36.25 38.0883 34.5 39.853 32.3383 39.853Z"
        fill="white"
      />
      <circle cx="36" cy="36" r="35" stroke="#2F1A49" stroke-width="2" />
      <defs>
        <radialGradient
          id="paint0_radial_741_5481"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(35.9995 36.0009) scale(34.8214 34.8214)"
        >
          <stop stop-color="#16A085" />
          <stop offset="0.2886" stop-color="#19A287" />
          <stop offset="0.4622" stop-color="#21A98D" />
          <stop offset="0.6053" stop-color="#2FB498" />
          <stop offset="0.7318" stop-color="#43C4A7" />
          <stop offset="0.8475" stop-color="#5ED9BB" />
          <stop offset="0.9537" stop-color="#7EF2D3" />
          <stop offset="1" stop-color="#8EFFDF" />
        </radialGradient>
      </defs>
    </svg>
  );
};

export const ElementLight = (props: JSX.IntrinsicElements["svg"]) => {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M36.0001 70.8236C55.2326 70.8236 70.8236 55.2326 70.8236 36.0001C70.8236 16.7675 55.2326 1.17651 36.0001 1.17651C16.7675 1.17651 1.17651 16.7675 1.17651 36.0001C1.17651 55.2326 16.7675 70.8236 36.0001 70.8236Z"
        fill="url(#paint0_radial_741_5519)"
      />
      <g opacity="0.1">
        <mask id="mask0_741_5519" maskUnits="userSpaceOnUse" x="1" y="1" width="70" height="70">
          <path
            d="M36.0001 70.8236C55.2326 70.8236 70.8236 55.2326 70.8236 36.0001C70.8236 16.7675 55.2326 1.17651 36.0001 1.17651C16.7675 1.17651 1.17651 16.7675 1.17651 36.0001C1.17651 55.2326 16.7675 70.8236 36.0001 70.8236Z"
            fill="white"
          />
        </mask>
        <g mask="url(#mask0_741_5519)">
          <path
            d="M89.8089 25.353C88.5883 36.9706 85.0589 48.5001 78.4854 58.1618C71.9119 67.8236 62.1178 75.5001 50.7942 78.3971C38.6472 81.5148 25.5001 78.9559 14.4119 73.1177C3.32364 67.2795 -5.88223 58.353 -13.7058 48.5442C-14.5881 47.4265 -15.5146 46.1912 -15.5293 44.7648C-3.7793 44.2648 7.67658 40.603 18.2648 35.4706C28.853 30.3383 38.6619 23.7501 48.3236 17.0442C44.8678 26.3824 39.5148 35.0148 32.6766 42.2648C52.2501 37.6324 69.3972 23.6912 77.9266 5.48535L89.8089 25.353Z"
            fill="#1A1A1A"
          />
        </g>
      </g>
      <path
        d="M36.0001 3.57365C54.8236 3.57365 70.1618 18.5295 70.7942 37.206C70.8089 36.8089 70.8236 36.4119 70.8236 36.0148C70.8236 16.7795 55.2353 1.19128 36.0001 1.19128C16.7648 1.19128 1.17651 16.7795 1.17651 36.0148C1.17651 36.4119 1.19121 36.8089 1.20592 37.206C1.83827 18.5148 17.1618 3.57365 36.0001 3.57365Z"
        fill="white"
      />
      <path
        d="M36.0001 69.6765C16.9265 69.6765 1.44122 54.3382 1.19122 35.3088C1.19122 35.5294 1.17651 35.7647 1.17651 35.9853C1.17651 55.2206 16.7648 70.8088 36.0001 70.8088C55.2353 70.8088 70.8236 55.2206 70.8236 35.9853C70.8236 35.7647 70.8236 35.5294 70.8089 35.3088C70.5589 54.3382 55.0736 69.6765 36.0001 69.6765Z"
        fill="white"
      />
      <path
        d="M47.6471 29.7795V24.6471H42.5148L35.9854 12.603L29.456 24.6471H24.3383V29.7795L12.2942 36.3089L24.3383 42.8383V47.9707H29.4707L36.0001 60.0148L42.5295 47.9707H47.6618V42.8383L59.706 36.3089L47.6471 29.7795ZM36.0001 45.0442C31.1766 45.0442 27.2648 41.1325 27.2648 36.3089C27.2648 31.4854 31.1766 27.5736 36.0001 27.5736C40.8236 27.5736 44.7354 31.4854 44.7354 36.3089C44.7207 41.1325 40.8089 45.0442 36.0001 45.0442Z"
        fill="white"
      />
      <path
        d="M36.0001 42.4854C39.4113 42.4854 42.1765 39.7201 42.1765 36.3089C42.1765 32.8977 39.4113 30.1324 36.0001 30.1324C32.5889 30.1324 29.8236 32.8977 29.8236 36.3089C29.8236 39.7201 32.5889 42.4854 36.0001 42.4854Z"
        fill="white"
      />
      <path
        opacity="0.1"
        d="M36 54.0147C19.6618 54.0147 5.97063 42.7647 2.20593 27.6029C1.54416 30.2941 1.17651 33.1029 1.17651 36.0147C1.17651 55.25 16.7647 70.8382 36 70.8382C55.2353 70.8382 70.8236 55.25 70.8236 36.0147C70.8236 33.1176 70.4706 30.2941 69.7942 27.6029C66.0295 42.7647 52.3383 54.0147 36 54.0147Z"
        fill="#1A1A1A"
      />
      <path
        opacity="0.5"
        d="M20.7362 22.805C24.159 19.3822 25.3136 14.9873 23.315 12.9888C21.3165 10.9902 16.9216 12.1448 13.4988 15.5676C10.076 18.9904 8.92142 23.3853 10.92 25.3838C12.9185 27.3824 17.3134 26.2278 20.7362 22.805Z"
        fill="white"
      />
      <path
        opacity="0.5"
        d="M31.0441 14.4117C33.1396 14.4117 34.8382 12.713 34.8382 10.6176C34.8382 8.52216 33.1396 6.82349 31.0441 6.82349C28.9487 6.82349 27.25 8.52216 27.25 10.6176C27.25 12.713 28.9487 14.4117 31.0441 14.4117Z"
        fill="white"
      />
      <path
        opacity="0.5"
        d="M56.5294 57.5147C55.1764 58.7353 54.5 60.1912 55 60.75C55.5 61.3088 57.0147 60.7647 58.3676 59.5441C59.7206 58.3235 60.397 56.8677 59.897 56.3088C59.397 55.75 57.8823 56.2941 56.5294 57.5147Z"
        fill="white"
      />
      <path
        opacity="0.5"
        d="M61.2941 53.9852C60.7352 54.4852 60.5735 55.2205 60.9264 55.6176C61.2794 56.0146 62.0294 55.9264 62.5882 55.4117C63.147 54.9117 63.3088 54.1764 62.9558 53.7793C62.5882 53.397 61.8529 53.4852 61.2941 53.9852Z"
        fill="white"
      />
      <circle cx="36" cy="36" r="35" stroke="#2F1A49" stroke-width="2" />
      <defs>
        <radialGradient
          id="paint0_radial_741_5519"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(35.9952 36.0009) scale(34.8214)"
        >
          <stop stop-color="#F4D6A6" />
          <stop offset="0.3986" stop-color="#F4D7A9" />
          <stop offset="0.6383" stop-color="#F5DCB1" />
          <stop offset="0.8353" stop-color="#F6E3BF" />
          <stop offset="1" stop-color="#F7EDD2" />
        </radialGradient>
      </defs>
    </svg>
  );
};

export const ElementDark = (props: JSX.IntrinsicElements["svg"]) => {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M36.0001 70.8236C55.2326 70.8236 70.8236 55.2326 70.8236 36C70.8236 16.7675 55.2326 1.17651 36.0001 1.17651C16.7675 1.17651 1.17651 16.7675 1.17651 36C1.17651 55.2326 16.7675 70.8236 36.0001 70.8236Z"
        fill="url(#paint0_radial_741_5396)"
      />
      <g opacity="0.1">
        <mask id="mask0_741_5396" maskUnits="userSpaceOnUse" x="1" y="1" width="70" height="70">
          <path
            d="M36.0001 70.8236C55.2326 70.8236 70.8236 55.2326 70.8236 36C70.8236 16.7675 55.2326 1.17651 36.0001 1.17651C16.7675 1.17651 1.17651 16.7675 1.17651 36C1.17651 55.2326 16.7675 70.8236 36.0001 70.8236Z"
            fill="white"
          />
        </mask>
        <g mask="url(#mask0_741_5396)">
          <path
            d="M89.8088 25.3529C88.5882 36.9706 85.0588 48.5 78.4853 58.1618C71.9118 67.8235 62.1029 75.4853 50.7941 78.3823C38.6471 81.5 25.5 78.9412 14.4118 73.1029C3.32352 67.2647 -5.88236 58.3382 -13.7059 48.5294C-14.5882 47.4118 -15.5147 46.1765 -15.5294 44.75C-3.77942 44.25 7.67645 40.5882 18.2647 35.4559C28.8529 30.3235 38.6618 23.7353 48.3235 17.0294C44.8676 26.3676 39.5147 35 32.6765 42.25C52.25 37.6176 69.3971 23.6765 77.9265 5.47058L89.8088 25.3529Z"
            fill="#1A1A1A"
          />
        </g>
      </g>
      <path
        opacity="0.1"
        d="M36.0001 54C19.6618 54 5.97063 42.75 2.20593 27.5883C1.54416 30.2794 1.17651 33.0883 1.17651 36C1.17651 55.2353 16.7648 70.8236 36.0001 70.8236C55.2353 70.8236 70.8236 55.2353 70.8236 36C70.8236 33.103 70.4706 30.2794 69.7942 27.5883C66.0295 42.7647 52.3236 54 36.0001 54Z"
        fill="#1A1A1A"
      />
      <path
        d="M36.0001 3.57357C54.8236 3.57357 70.1618 18.5295 70.7942 37.2059C70.8089 36.8089 70.8236 36.4118 70.8236 36.0148C70.8236 16.7648 55.2206 1.17651 36.0001 1.17651C16.7648 1.17651 1.17651 16.7648 1.17651 36C1.17651 36.3971 1.19121 36.7942 1.20592 37.1912C1.83827 18.5148 17.1618 3.57357 36.0001 3.57357Z"
        fill="white"
      />
      <path
        d="M36.0001 69.6765C16.9265 69.6765 1.44122 54.3383 1.19122 35.3088C1.19122 35.5294 1.17651 35.7647 1.17651 35.9853C1.17651 55.2206 16.7648 70.8088 36.0001 70.8088C55.2353 70.8088 70.8236 55.2206 70.8236 35.9853C70.8236 35.7647 70.8236 35.5294 70.8089 35.3088C70.5589 54.3383 55.0736 69.6765 36.0001 69.6765Z"
        fill="white"
      />
      <path
        d="M47.3383 37.8236C42.5 37.8236 38.5883 33.9118 38.5883 29.0736C38.5883 26.5294 39.6765 24.25 41.4118 22.6471C39.75 21.9706 37.9265 21.5883 36.0147 21.5883C28.0589 21.5883 21.6177 28.0294 21.6177 35.9853C21.6177 43.9412 28.0589 50.3824 36.0147 50.3824C43.5294 50.3824 49.7059 44.6177 50.353 37.2647C49.4265 37.6324 48.4118 37.8236 47.3383 37.8236Z"
        fill="white"
      />
      <path
        d="M47.4118 35.6912C51.0747 35.6912 54.0441 32.7218 54.0441 29.0589C54.0441 25.3959 51.0747 22.4265 47.4118 22.4265C43.7488 22.4265 40.7794 25.3959 40.7794 29.0589C40.7794 32.7218 43.7488 35.6912 47.4118 35.6912Z"
        fill="white"
      />
      <path
        opacity="0.1"
        d="M36 54.0147C19.6618 54.0147 5.97063 42.7647 2.20593 27.6029C1.54416 30.2941 1.17651 33.1029 1.17651 36.0147C1.17651 55.25 16.7647 70.8382 36 70.8382C55.2353 70.8382 70.8236 55.25 70.8236 36.0147C70.8236 33.1176 70.4706 30.2941 69.7942 27.6029C66.0295 42.7647 52.3383 54.0147 36 54.0147Z"
        fill="#1A1A1A"
      />
      <path
        opacity="0.5"
        d="M20.7362 22.805C24.159 19.3822 25.3136 14.9873 23.315 12.9888C21.3165 10.9902 16.9216 12.1448 13.4988 15.5676C10.076 18.9904 8.92142 23.3853 10.92 25.3838C12.9185 27.3824 17.3134 26.2278 20.7362 22.805Z"
        fill="white"
      />
      <path
        opacity="0.5"
        d="M31.0441 14.4117C33.1396 14.4117 34.8382 12.713 34.8382 10.6176C34.8382 8.52216 33.1396 6.82349 31.0441 6.82349C28.9487 6.82349 27.25 8.52216 27.25 10.6176C27.25 12.713 28.9487 14.4117 31.0441 14.4117Z"
        fill="white"
      />
      <path
        opacity="0.5"
        d="M56.5294 57.5147C55.1764 58.7353 54.5 60.1912 55 60.75C55.5 61.3088 57.0147 60.7647 58.3676 59.5441C59.7206 58.3235 60.397 56.8677 59.897 56.3088C59.397 55.75 57.8823 56.2941 56.5294 57.5147Z"
        fill="white"
      />
      <path
        opacity="0.5"
        d="M61.2941 53.9852C60.7352 54.4852 60.5735 55.2205 60.9264 55.6176C61.2794 56.0146 62.0294 55.9264 62.5882 55.4117C63.147 54.9117 63.3088 54.1764 62.9558 53.7793C62.5882 53.397 61.8529 53.4852 61.2941 53.9852Z"
        fill="white"
      />
      <circle cx="36" cy="36" r="35" stroke="#2F1A49" stroke-width="2" />
      <defs>
        <radialGradient
          id="paint0_radial_741_5396"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(35.9952 35.9979) scale(34.8214 34.8214)"
        >
          <stop stop-color="#410081" />
          <stop offset="0.2502" stop-color="#430383" />
          <stop offset="0.4006" stop-color="#4B0B88" />
          <stop offset="0.5248" stop-color="#571992" />
          <stop offset="0.6346" stop-color="#692EA0" />
          <stop offset="0.7349" stop-color="#8048B1" />
          <stop offset="0.8284" stop-color="#9C68C7" />
          <stop offset="0.9147" stop-color="#BD8EE1" />
          <stop offset="0.9966" stop-color="#E3B9FE" />
          <stop offset="1" stop-color="#E5BBFF" />
        </radialGradient>
      </defs>
    </svg>
  );
};

export const ElementNoElement = (props: JSX.IntrinsicElements["svg"]) => {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <g opacity="0.1">
        <mask id="mask0_741_5360" maskUnits="userSpaceOnUse" x="1" y="1" width="70" height="70">
          <path
            d="M36 70.8236C55.2325 70.8236 70.8236 55.2325 70.8236 36C70.8236 16.7675 55.2325 1.17651 36 1.17651C16.7675 1.17651 1.17651 16.7675 1.17651 36C1.17651 55.2325 16.7675 70.8236 36 70.8236Z"
            fill="white"
          />
        </mask>
        <g mask="url(#mask0_741_5360)">
          <path
            d="M89.8089 25.3529C88.5884 36.9706 85.0589 48.5 78.4854 58.1618C71.9119 67.8088 62.1178 75.4853 50.7942 78.3823C38.6472 81.5 25.5001 78.9412 14.4119 73.1029C3.30894 67.2647 -5.89694 58.3382 -13.7058 48.5294C-14.5881 47.4118 -15.5146 46.1765 -15.5293 44.75C-3.7793 44.25 7.67659 40.5882 18.2648 35.4559C28.8531 30.3235 38.6619 23.7353 48.3236 17.0294C44.8678 26.3676 39.5148 35 32.6766 42.25C52.2501 37.6176 69.3972 23.6765 77.9266 5.47058L89.8089 25.3529Z"
            fill="#1A1A1A"
          />
        </g>
      </g>
      <path
        opacity="0.3"
        d="M36 3.57357C54.8236 3.57357 70.1618 18.5295 70.7942 37.2059C70.8089 36.8089 70.8236 36.4118 70.8236 36.0147C70.8236 16.7647 55.2353 1.17651 36 1.17651C16.7647 1.17651 1.17651 16.7647 1.17651 36C1.17651 36.3971 1.19122 36.7942 1.20593 37.1912C1.83828 18.5147 17.1618 3.57357 36 3.57357Z"
        fill="white"
      />
      <path
        opacity="0.3"
        d="M36 69.6765C16.9265 69.6765 1.44122 54.3382 1.19122 35.3088C1.19122 35.5294 1.17651 35.7647 1.17651 35.9853C1.17651 55.2206 16.7647 70.8088 36 70.8088C55.2353 70.8088 70.8236 55.2206 70.8236 35.9853C70.8236 35.7647 70.8236 35.5294 70.8089 35.3088C70.5589 54.3382 55.0736 69.6765 36 69.6765Z"
        fill="white"
      />
      <path
        d="M52.1471 36.9705L45.0735 28.5882L41.7206 31.6176L36.3383 27.1029L42.7794 19.8382L31.2059 11.0735L36.9706 19.8529L28.5883 26.9264L31.6324 30.2794L27.1177 35.647L19.853 29.2058L11.0883 40.7794L19.853 35.0147L26.9265 43.397L30.2794 40.3529L35.6618 44.8676L29.2206 52.1323L40.7941 60.897L35.0294 52.1323L43.4118 45.0588L40.3677 41.7058L44.8824 36.3235L52.1471 42.7647L60.9118 31.1911L52.1471 36.9705ZM36 39.1764C34.2353 39.1764 32.8235 37.75 32.8235 36C32.8235 34.25 34.25 32.8235 36 32.8235C37.7647 32.8235 39.1765 34.25 39.1765 36C39.1765 37.75 37.7647 39.1764 36 39.1764Z"
        fill="white"
      />
      <path
        opacity="0.1"
        d="M36 54.0147C19.6618 54.0147 5.97063 42.7647 2.20593 27.6029C1.54416 30.2941 1.17651 33.1029 1.17651 36.0147C1.17651 55.25 16.7647 70.8382 36 70.8382C55.2353 70.8382 70.8236 55.25 70.8236 36.0147C70.8236 33.1176 70.4706 30.2941 69.7942 27.6029C66.0295 42.7647 52.3383 54.0147 36 54.0147Z"
        fill="#1A1A1A"
      />
      <path
        opacity="0.5"
        d="M20.7362 22.805C24.159 19.3822 25.3136 14.9873 23.315 12.9888C21.3165 10.9902 16.9216 12.1448 13.4988 15.5676C10.076 18.9904 8.92142 23.3853 10.92 25.3838C12.9185 27.3824 17.3134 26.2278 20.7362 22.805Z"
        fill="white"
      />
      <path
        opacity="0.5"
        d="M31.0441 14.4117C33.1396 14.4117 34.8382 12.713 34.8382 10.6176C34.8382 8.52216 33.1396 6.82349 31.0441 6.82349C28.9487 6.82349 27.25 8.52216 27.25 10.6176C27.25 12.713 28.9487 14.4117 31.0441 14.4117Z"
        fill="white"
      />
      <path
        opacity="0.5"
        d="M56.5294 57.5147C55.1764 58.7353 54.5 60.1912 55 60.75C55.5 61.3088 57.0147 60.7647 58.3676 59.5441C59.7206 58.3235 60.397 56.8677 59.897 56.3088C59.397 55.75 57.8823 56.2941 56.5294 57.5147Z"
        fill="white"
      />
      <path
        opacity="0.5"
        d="M61.2941 53.9852C60.7352 54.4852 60.5735 55.2205 60.9264 55.6176C61.2794 56.0146 62.0294 55.9264 62.5882 55.4117C63.147 54.9117 63.3088 54.1764 62.9558 53.7793C62.5882 53.397 61.8529 53.4852 61.2941 53.9852Z"
        fill="white"
      />
      <circle cx="36" cy="36" r="35" stroke="#2F1A49" stroke-width="2" />
    </svg>
  );
};

export const LogoText = (props: JSX.IntrinsicElements["svg"]) => {
  return (
    <svg width="366" height="73" viewBox="0 0 366 73" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="28.3" y="18.1" width="12.4" height="40" rx="6.2" class="fill-accent-color" />
      <rect
        x="43.919"
        y="41.8155"
        width="7.48997"
        height="24.1612"
        rx="3.74498"
        transform="rotate(-45 43.919 41.8155)"
        class="fill-brand-color-2nd"
      />
      <rect
        x="60.9526"
        y="36.5"
        width="7.48997"
        height="24.1612"
        rx="3.74498"
        transform="rotate(45 60.9526 36.5)"
        class="fill-brand-color-2nd"
      />
      <rect x="45.7" y="17.5" width="18.4" height="18.4" rx="9.2" class="fill-brand-color-3rd" />
      <path
        d="M90.375 53.5C89.5208 53.1875 88.9896 52.9583 88.7812 52.8125C88.5729 52.6458 88.3854 52.4375 88.2188 52.1875C87.2812 50.7708 86.6042 46.5625 86.1875 39.5625C86.0833 38 86.0312 36.4688 86.0312 34.9688C86.0312 33.4688 86.0625 32.0833 86.125 30.8125C86.1875 29.5208 86.2708 28.3021 86.375 27.1562C86.6042 24.5729 86.8125 23.0208 87 22.5L87.375 21.3125C87.7083 20.3125 88.4688 19.5729 89.6562 19.0938C90.1771 18.8854 90.8542 18.6458 91.6875 18.375L94.4375 17.4375C95.4583 17.125 96.5208 16.8125 97.625 16.5L100.812 15.5625C102.958 14.9583 104.771 14.5 106.25 14.1875L107.938 21.7812C107.417 21.9062 106.781 22.0417 106.031 22.1875L98.4062 23.625L96.25 24.0625C95.625 24.2083 95.1562 24.3229 94.8438 24.4062C94.2604 26.7396 93.9688 30.125 93.9688 34.5625C93.9688 40.3542 94.3229 44.625 95.0312 47.375C95.9062 47.5833 96.8542 47.7917 97.875 48L104.312 49.3125L107.344 49.875L105.594 57.0938C103.719 56.7604 102.01 56.4062 100.469 56.0312C94.6146 54.6354 91.25 53.7917 90.375 53.5ZM135.094 57.75C126.51 56.875 119.781 55.5729 114.906 53.8438C114.01 53.5104 113.417 51.5938 113.125 48.0938C112.875 44.8854 113.146 42.1042 113.938 39.75C114.271 38.7708 114.667 38.2292 115.125 38.125C117.083 37.6042 119.146 37.2292 121.312 37L127.812 36.2812L127.688 31.875C125.417 31.4375 123.156 31.0938 120.906 30.8438C118.677 30.5729 116.458 30.2604 114.25 29.9062L115.906 23.0625L121.188 23.8438C126.021 24.5521 129.865 25.4167 132.719 26.4375C134.094 26.9375 134.781 27.9479 134.781 29.4688L134.906 46.5938L128.25 47.25L128.062 41.9062L126.281 42.25C124.281 42.5833 122.375 43 120.562 43.5C120.333 44.6042 120.219 45.5208 120.219 46.25C120.219 47.3125 120.26 48.1354 120.344 48.7188C123.281 49.3854 127.812 50.0625 133.938 50.75L136.5 51.0312L135.094 57.75ZM142.438 10.9062L150.188 9.46875L150.406 32L149.438 55.5L142.844 56.0625L142.438 10.9062ZM160.375 54.0312C159.229 53.6562 158.562 52.7917 158.375 51.4375C157.958 48.5625 157.75 45.9375 157.75 43.5625C157.75 41.1667 157.771 39.3958 157.812 38.25C157.875 37.0833 157.958 35.9583 158.062 34.875C158.438 30.3542 158.948 27.7083 159.594 26.9375C159.927 26.5208 160.469 26.2083 161.219 26C161.99 25.7708 163.01 25.5417 164.281 25.3125C165.573 25.0625 166.927 24.8333 168.344 24.625C169.781 24.3958 171.188 24.1875 172.562 24C173.958 23.8125 175.146 23.6458 176.125 23.5L177.219 30.5312L174.812 30.7812C170.354 31.2396 167.51 31.625 166.281 31.9375C165.948 33.2292 165.719 35.0417 165.594 37.375C165.469 39.7083 165.406 41.4167 165.406 42.5C165.406 45.1875 165.51 47.1979 165.719 48.5312L177.656 50.75L175.812 57.4688C174.104 57.1979 172.5 56.9062 171 56.5938L167.219 55.8125C163.802 55.0625 161.521 54.4688 160.375 54.0312ZM187.156 55.1875C186.594 55.125 185.979 54.7188 185.312 53.9688C184.229 52.8229 183.667 51.7396 183.625 50.7188L183 25.0312L190.312 24.25L191.062 48.4375C191.771 48.7917 192.542 48.9688 193.375 48.9688C194.583 48.9688 196.51 48.3333 199.156 47.0625L199.875 24.7188H207.094L206.625 55.1875L201.438 55.8125L200.094 50.8125L193.562 55.4375L187.156 55.1875ZM215.062 10.9062L222.812 9.46875L223.031 32L222.062 55.5L215.469 56.0625L215.062 10.9062ZM251.969 57.75C243.385 56.875 236.656 55.5729 231.781 53.8438C230.885 53.5104 230.292 51.5938 230 48.0938C229.75 44.8854 230.021 42.1042 230.812 39.75C231.146 38.7708 231.542 38.2292 232 38.125C233.958 37.6042 236.021 37.2292 238.188 37L244.688 36.2812L244.562 31.875C242.292 31.4375 240.031 31.0938 237.781 30.8438C235.552 30.5729 233.333 30.2604 231.125 29.9062L232.781 23.0625L238.062 23.8438C242.896 24.5521 246.74 25.4167 249.594 26.4375C250.969 26.9375 251.656 27.9479 251.656 29.4688L251.781 46.5938L245.125 47.25L244.938 41.9062L243.156 42.25C241.156 42.5833 239.25 43 237.438 43.5C237.208 44.6042 237.094 45.5208 237.094 46.25C237.094 47.3125 237.135 48.1354 237.219 48.7188C240.156 49.3854 244.688 50.0625 250.812 50.75L253.375 51.0312L251.969 57.75ZM261.562 54.0312C260.417 53.6562 259.75 52.7917 259.562 51.4375C259.146 48.5625 258.938 45.9375 258.938 43.5625C258.938 41.1667 258.958 39.3958 259 38.25C259.062 37.0833 259.146 35.9583 259.25 34.875C259.625 30.3542 260.135 27.7083 260.781 26.9375C261.115 26.5208 261.656 26.2083 262.406 26C263.177 25.7708 264.198 25.5417 265.469 25.3125C266.76 25.0625 268.115 24.8333 269.531 24.625C270.969 24.3958 272.375 24.1875 273.75 24C275.146 23.8125 276.333 23.6458 277.312 23.5L278.406 30.5312L276 30.7812C271.542 31.2396 268.698 31.625 267.469 31.9375C267.135 33.2292 266.906 35.0417 266.781 37.375C266.656 39.7083 266.594 41.4167 266.594 42.5C266.594 45.1875 266.698 47.1979 266.906 48.5312L278.844 50.75L277 57.4688C275.292 57.1979 273.688 56.9062 272.188 56.5938L268.406 55.8125C264.99 55.0625 262.708 54.4688 261.562 54.0312ZM284.531 17.3438L292.156 15.875V25.6875L300 24.2188L300.594 31.3125L292.281 31.9375L291.688 48.8438C293.229 49.3229 294.562 49.6979 295.688 49.9688C298.5 50.6354 300.219 51.0521 300.844 51.2188L299.188 57.75C294.562 56.7292 290.51 55.5521 287.031 54.2188C285.615 53.6979 284.906 52.7604 284.906 51.4062L284.531 17.3438ZM314.188 37C314.188 42.0208 314.448 46.375 314.969 50.0625L321.125 49.75C322.25 45.2917 322.812 40.9375 322.812 36.6875C322.812 34.9792 322.698 33.4583 322.469 32.125C321.219 31.5 316.802 31.1875 309.219 31.1875H307.625C307.188 31.1875 306.708 31.2083 306.188 31.25L307.531 24C307.885 23.9792 308.208 23.9583 308.5 23.9375C308.812 23.8958 309.125 23.875 309.438 23.875L310.375 23.8125C310.688 23.8125 311.562 23.8125 313 23.8125C317.125 23.8125 321.646 24.3646 326.562 25.4688C328.125 25.8646 329.083 26.5625 329.438 27.5625C329.979 29.1042 330.25 31.6146 330.25 35.0938C330.25 41.4479 329.281 47.5938 327.344 53.5312C327.177 54.0729 326.979 54.5312 326.75 54.9062C326.542 55.2812 326.167 55.5208 325.625 55.625C325.083 55.75 324.448 55.8646 323.719 55.9688C322.99 56.0729 322.271 56.1667 321.562 56.25C320.021 56.3958 318.958 56.4688 318.375 56.4688C317.792 56.4688 317.167 56.4583 316.5 56.4375C315.833 56.4375 315.104 56.4167 314.312 56.375C312.229 56.2708 310.823 56.0833 310.094 55.8125C309.365 55.5625 308.865 55.125 308.594 54.5C308.344 53.875 308.094 52.875 307.844 51.5C307.26 48.2917 306.969 44.6354 306.969 40.5312C306.969 38.9688 307.01 37.4167 307.094 35.875L314.188 34.4688V37ZM337.844 31.25L337.781 25.4688L344.438 24.7812L345.531 29.5312L350.312 24.2812H354.031L355.594 31.5938C355.594 31.5938 353.958 31.9479 350.688 32.6562C349.125 32.9896 347.51 33.3542 345.844 33.75L345.406 55.125L338.344 55.75L337.844 31.25Z"
        class="fill-accent-color"
      />
    </svg>
  );
};
