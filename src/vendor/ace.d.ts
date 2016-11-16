/**
 * Add custom properties to Window.
 */
interface Window {
    /**
     * The human readable version string that indicates the current version of Ace.
     * This version is semver compatible, although that shouldn't matter. 
     */
    ACE_VERSION: string;

    /**
     * The actual build number that is incremented for every new release of Ace.
     * This number is compared to the latest release published, and if the release
     * is higher, the current installation is presumed to be out-to-date.
     */
    ACE_BUILD: number;
}