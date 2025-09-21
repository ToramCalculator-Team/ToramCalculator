import { JSX } from "solid-js/jsx-runtime";

export const OutlineIcons = {
  AddUser: (props: JSX.IntrinsicElements["svg"]) => {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <circle cx="4" cy="4" r="4" transform="matrix(-1 0 0 1 14 3)" stroke="currentColor" stroke-width="1.5" />
        <path
          d="M3 16.9347C3 16.0743 3.54085 15.3068 4.35109 15.0175V15.0175C8.00404 13.7128 11.996 13.7128 15.6489 15.0175V15.0175C16.4591 15.3068 17 16.0743 17 16.9347V18.2502C17 19.4376 15.9483 20.3498 14.7728 20.1818L13.8184 20.0455C11.2856 19.6837 8.71435 19.6837 6.18162 20.0455L5.22721 20.1818C4.0517 20.3498 3 19.4376 3 18.2502V16.9347Z"
          stroke="currentColor"
          stroke-width="1.5"
        />
        <path d="M17 11H21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M19 9L19 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    );
  },

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

  Burger: (props: JSX.IntrinsicElements["svg"]) => {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M20 6L4 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        <path d="M20 12L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        <path d="M20 18H4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
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

  Chart: (props: JSX.IntrinsicElements["svg"]) => {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" stroke-width="1.5" />
        <path d="M8 17L8 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M12 17L12 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        <path
          d="M16 17L16 10"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
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

  Edit: (props: JSX.IntrinsicElements["svg"]) => {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M13.5137 3.80576C14.5869 2.73101 16.3274 2.73035 17.4013 3.80429L19.8932 6.29615C20.958 7.36093 20.969 9.08469 19.918 10.1631L10.6849 19.6363C9.97933 20.3602 9.01167 20.7684 8.00124 20.7683L5.24909 20.7682C3.96984 20.7682 2.94823 19.7018 3.00203 18.4227L3.12019 15.6137C3.15968 14.6746 3.54996 13.7846 4.2138 13.1198L13.5137 3.80576ZM16.3415 4.86576C15.8533 4.3776 15.0622 4.3779 14.5744 4.86642L12.9113 6.53203L17.1911 10.8118L18.8446 9.1153C19.3224 8.62513 19.3173 7.8416 18.8333 7.35761L16.3415 4.86576ZM5.27446 14.1804L11.8514 7.59349L16.144 11.8861L9.61148 18.5886C9.18816 19.0229 8.60756 19.2678 8.0013 19.2678L5.24916 19.2676C4.82274 19.2676 4.4822 18.9122 4.50014 18.4858L4.61829 15.6768C4.64199 15.1133 4.87616 14.5794 5.27446 14.1804ZM20.5148 20.695C20.9289 20.695 21.2645 20.3591 21.2645 19.9447C21.2645 19.5304 20.9289 19.1945 20.5148 19.1945H14.3931C13.9791 19.1945 13.6434 19.5304 13.6434 19.9447C13.6434 20.3591 13.9791 20.695 14.3931 20.695H20.5148Z"
          fill="currentColor"
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

  InfoCircle: (props: JSX.IntrinsicElements["svg"]) => {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
        <rect x="2" y="2" width="20" height="20" rx="10" stroke="currentColor" stroke-width="1.5" />
        <path
          d="M12.5 17L12.5 11"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M10.5 11L12.5 11"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M12.5 8L12.5 7"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    );
  },

  Receipt: (props: JSX.IntrinsicElements["svg"]) => {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
        <path
          d="M5 3.5H19V19.4656C19 20.2959 18.0466 20.7645 17.3892 20.2574L16.0584 19.2307C15.7236 18.9725 15.2625 18.9527 14.9068 19.1813L13.0815 20.3547C12.4227 20.7783 11.5773 20.7783 10.9185 20.3547L9.0932 19.1813C8.73751 18.9527 8.27644 18.9725 7.94164 19.2307L6.6108 20.2574C5.95338 20.7645 5 20.2959 5 19.4656V3.5Z"
          stroke="currentColor"
          stroke-width="1.5"
        />
        <path d="M9 9.5H12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M3 3.5H21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M9 13.5H12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        <path
          d="M15 9.5H15.5"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M15 13.5H15.5"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
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
      <svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" class="fill-primary-color" {...props}>
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

  Save: (props: JSX.IntrinsicElements["svg"]) => {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path
          d="M2 6C2 3.79086 3.79086 2 6 2H12H14.7574C15.553 2 16.3161 2.31607 16.8787 2.87868L21.1213 7.12132C21.6839 7.68393 22 8.44699 22 9.24264V12V18C22 20.2091 20.2091 22 18 22H6C3.79086 22 2 20.2091 2 18V6Z"
          stroke="currentColor"
          stroke-width="1.5"
        />
        <path
          d="M6 15C6 13.8954 6.89543 13 8 13H16C17.1046 13 18 13.8954 18 15V22H6V15Z"
          stroke="currentColor"
          stroke-width="1.5"
        />
        <path
          d="M8 2V6C8 6.55228 8.44772 7 9 7H15C15.5523 7 16 6.55228 16 6V2"
          stroke="currentColor"
          stroke-width="1.5"
        />
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

  Share: (props: JSX.IntrinsicElements["svg"]) => {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <circle cx="17.5" cy="4.5" r="2.5" stroke="currentColor" stroke-width="1.5" />
        <circle cx="5.5" cy="11.5" r="2.5" stroke="currentColor" stroke-width="1.5" />
        <path d="M15 6L8 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        <path
          d="M7.5 13.5L15 18"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <circle cx="17.5" cy="19.5" r="2.5" stroke="currentColor" stroke-width="1.5" />
      </svg>
    );
  },

  Swap: (props: JSX.IntrinsicElements["svg"]) => {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path
          d="M5 8L7.29289 5.70711C7.68342 5.31658 8.31658 5.31658 8.70711 5.70711L11 8M8 6L8 18M14 17L16.2929 19.2929C16.6834 19.6834 17.3166 19.6834 17.7071 19.2929L20 17M17 19V7"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
      </svg>
    );
  },

  Trash: (props: JSX.IntrinsicElements["svg"]) => {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path
          d="M5.05063 8.73418C4.20573 7.60763 5.00954 6 6.41772 6H17.5823C18.9905 6 19.7943 7.60763 18.9494 8.73418V8.73418C18.3331 9.55584 18 10.5552 18 11.5823V18C18 20.2091 16.2091 22 14 22H10C7.79086 22 6 20.2091 6 18V11.5823C6 10.5552 5.66688 9.55584 5.05063 8.73418V8.73418Z"
          stroke="currentColor"
          stroke-width="1.5"
        />
        <path
          d="M14 17L14 11"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M10 17L10 11"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M16 6L15.4558 4.36754C15.1836 3.55086 14.4193 3 13.5585 3H10.4415C9.58066 3 8.81638 3.55086 8.54415 4.36754L8 6"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
      </svg>
    );
  },

  User: (props: JSX.IntrinsicElements["svg"]) => {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="25" height="24" viewBox="0 0 25 24" fill="none" {...props}>
        <circle cx="4" cy="4" r="4" transform="matrix(-1 0 0 1 16.25 3)" stroke="currentColor" stroke-width="1.5" />
        <path
          d="M5.25 16.9347C5.25 16.0743 5.79085 15.3068 6.60109 15.0175V15.0175C10.254 13.7128 14.246 13.7128 17.8989 15.0175V15.0175C18.7091 15.3068 19.25 16.0743 19.25 16.9347V18.2502C19.25 19.4376 18.1983 20.3498 17.0228 20.1818L16.0684 20.0455C13.5356 19.6837 10.9644 19.6837 8.43162 20.0455L7.47721 20.1818C6.3017 20.3498 5.25 19.4376 5.25 18.2502V16.9347Z"
          stroke="currentColor"
          stroke-width="1.5"
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

  ZoomIn: (props: JSX.IntrinsicElements["svg"]) => {
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
        <path d="M8 11H14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        <path
          d="M11 7.99995L11 14"
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
};
