import { useEffect, useRef } from 'react';
import styled, { css } from 'styled-components'
import { useDispatch, useSelector } from 'react-redux'
import useScrollPosition from '@react-hook/window-scroll'
import { useWeb3React } from '@web3-react/core';
import Jazzicon from "@metamask/jazzicon";
import { HamburgerIcon, CloseIcon } from '@chakra-ui/icons'

import { toHex, truncateAddress } from '../../hooks/utils';
import { setCorrectChain } from '../../state/chain/reducer';
import { ALL_SUPPORTED_CHAIN_IDS, CHAIN_IDS_NETWORK_PARAMETERS, CHAIN_IDS_TO_NAMES } from '../../constants/chains';
import { setModal } from '../../state/modal/reducer';
import { setIsOpen } from '../../state/sidebar/reducer';
import { theme } from '../../theme';
import { connectors } from '../WalletModal/connectors';
import ChainSelector from './chainSelector';

const HeaderWrapper = styled.div`
    position: sticky;
    width: 100%;
    padding: 0px 40px 0 40px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    top: 0;
    z-index: 2;
    height: 80px;

    border-bottom: ${({showBackground}) => (showBackground ? `1px solid var(--divider)` : `0px`)};
    background-color: ${({showBackground}) => (showBackground ? `var(--alt-background)` : `var(--main-background)`)};
    transition: 0.5s all ease;

    @media screen and (max-width: ${theme.breakpoint}px) {
        padding: 0px 20px 0 20px;
    }
`

const AppButtons = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;

    transition: 0.2s ease-in-out;
    margin-left: ${({ isOpen }) => (isOpen ? `${theme.sidebar_width}px` : `0px`)};

    @media screen and (max-width: ${theme.breakpoint}px) {
        margin-left: 0;
    }
`

const LogoWrapper = styled.div`
    font-size: 2rem;
    font-weight: 600;
    font-style: italic;
    color: var(--main-text);

    &:hover {
        cursor: pointer;
    }
`

const WrongChain = css`
    background-color: var(--error);
`

const RightChain = css`
    background-color: transparent;
`

const Connected = css`
    &:hover {   
        font-size: 0;
    }

    &:hover::after {   
        content: "Disconnect";
        font-size: 1rem;
    }
`

const ButtonsWrapper = styled.div`
    display: flex;
    align-items: center;
    justify-content: center; 
    padding-right: 10px;
`

const ConnectButton = styled.button`
    width: 150px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center; 

    padding: 5px 10px;
    margin: 4px 0px 4px 10px;

    border-radius: 5px;
    font-size: 16px;
    cursor: pointer;
    transition: box-shadow, margin 0.2s ease-in-out;
    
    box-shadow: 2px 2px 2px 1px var(--main-text);
    border: 1px solid var(--main-text);
    &:hover {
        box-shadow: 0 0 0 white;
        margin: 6px 0px 2px 10px;
    }

    ${(props) => props.wrongChain ? WrongChain : RightChain}
    ${(props) => props.connected ? Connected : null}
`

const StyledIdenticon = styled.div`
    display: flex;
    align-items: center;
    justify-content: center; 

    ${ConnectButton}:hover & {   
        display: none;
    }
`;

const SidebarButton = styled.button`
    align-items: center;
    padding-right: 10px;
    font-size: ${({sidebarIsOpen}) => (sidebarIsOpen ? `1.1rem` : `1.5rem`)};
    width: 34px;
`

export default function Header ({ onOpen }) {
    const selectedChain = useSelector(state => state.chain.selectedChain);
    const correctChain = useSelector(state => state.chain.correctChain);
    const sidebarIsOpen = useSelector(state => state.sidebar.isOpen);

    const scrollY = useScrollPosition();
    const dispatch = useDispatch();
    const {
        library,
        chainId,
        account,
        activate,
        deactivate,
        active,
        error
    } = useWeb3React();

    // Connect on load if account was left connected
    useEffect(() => {
        const provider = window.localStorage.getItem("provider");
        if (provider) activate(connectors[provider]);
    }, []);

    useEffect(() => {
        if (CHAIN_IDS_TO_NAMES[chainId] === selectedChain) {
            dispatch(setCorrectChain(true))
        } else {
            dispatch(setCorrectChain(false))
        }
    }, [chainId, selectedChain])

    const handleConnect = () => {
        onOpen()
        dispatch(setModal('connect-wallet'))
    }

    const handleDisconnect = () => {
        deactivate()
        dispatch(setModal(''))
        window.localStorage.setItem("provider", undefined);
    }

    const toggleOpen = () => {
        dispatch(setIsOpen(!sidebarIsOpen))
    }

    const switchNetwork = async () => {
        try {
          await library.provider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: CHAIN_IDS_NETWORK_PARAMETERS[selectedChain].chainId }]
          });
        } catch (switchError) {
          if (switchError.code === 4902) {
            try {
              await library.provider.request({
                method: "wallet_addEthereumChain",
                params: [CHAIN_IDS_NETWORK_PARAMETERS[selectedChain]]
              });
            } catch (error) {
              console.log(error);
            }
          }
        }
    };

    function Identicon() {
        const ref = useRef();
        const { account, } = useWeb3React();
    
        useEffect(() => {
            if (account && ref.current) {
                ref.current.innerHTML = "";
                ref.current.appendChild(Jazzicon(16, parseInt(account.slice(2,10), 16)));
            }
        }, [account]);
    
        return <StyledIdenticon ref={ref} />
    }

    function OpenSidebarIcon () {
        return (
            <SidebarButton sidebarIsOpen={sidebarIsOpen} onClick={toggleOpen}>
                <HamburgerIcon />
            </SidebarButton>
        )
    }

    function CloseSidebarIcon () {
        return (
            <SidebarButton sidebarIsOpen={sidebarIsOpen} onClick={toggleOpen}>
                <CloseIcon />
            </SidebarButton>
        )
    }

    function ButtonsComponent () {
        if (active) {
            if (correctChain) {
                return(
                    <ButtonsWrapper>
                        <ChainSelector />
                        <ConnectButton onClick={handleDisconnect} connected={true}><Identicon />&nbsp;&nbsp;{ truncateAddress(account) }</ConnectButton>
                    </ButtonsWrapper>
                )
            } else {  // Uncorrect chain, prompt the change
                return(
                    <ButtonsWrapper>
                        <ChainSelector />
                        <ConnectButton onClick={switchNetwork} wrongChain={true}>Change Network</ConnectButton>
                    </ButtonsWrapper>
                )
            }
        } else {  
            return (
                <ButtonsWrapper>
                    <ChainSelector />
                    <ConnectButton onClick={handleConnect}>Connect Wallet</ConnectButton>
                </ButtonsWrapper>
            )
        }
    }

    return (
        <HeaderWrapper showBackground={scrollY > 45}>
            <AppButtons isOpen={sidebarIsOpen}>
                { sidebarIsOpen ? <CloseSidebarIcon /> : <OpenSidebarIcon /> }
                <LogoWrapper onClick={toggleOpen}>
                    bq
                </LogoWrapper>
            </AppButtons>
            <ButtonsComponent />
        </HeaderWrapper>
    )
}