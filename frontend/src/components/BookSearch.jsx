import styles from "./BookSearch.module.css";
import Button from "./ui/Button";


function BookSearch({ searchTerm, loading, onSearchTermChange, onSubmit }) {
  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <input
        type="search"
        placeholder="Search by title or author"
        value={searchTerm}
        onChange={(event) => onSearchTermChange(event.target.value)}
        required
      />
      <Button type="submit" disabled={loading}>
        {loading ? "Searching..." : "Search"}
      </Button>
    </form>
  );
}

export default BookSearch;
