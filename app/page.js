import { db } from '@/utils/db'

const Page = async () => {
  const res = await db.query(`
  SELECT beer.name, beer.style, beer.abv, beer.ibu, brewer.name as brewery_name
  FROM catalog_beer.beer beer
  JOIN catalog_beer.brewer brewer
  ON beer.brewer_id::uuid = brewer.id
  ORDER BY beer.name ASC
`)
  const beers = res.rows

  return (
    <div className='p-2'>
      <h1 className='text-4xl font-bold p-2'>🍻 Beers!</h1>
      <div className='hidden sm:grid sticky top-0 bg-white w-full grid-cols-1 sm:grid-cols-5 gap-2 border-b p-2'>
        <p className='font-bold'>Name</p>
        <p className='font-bold'>Brewery</p>
        <p className='font-bold'>IBU</p>
        <p className='font-bold'>ABV</p>
        <p className='font-bold'>Style</p>
      </div>
      {beers.map(beer => (
        <div className='w-full grid grid-cols-1 sm:grid-cols-5 gap-2 border-b p-2' key={beer.id}>
          <p className='font-bold'>{beer.name}</p>
          <p>{beer.brewery_name}</p>
          <p>{beer.ibu}</p>
          <p>{beer.abv}%</p>
          <p>{beer.style}</p>
        </div>
      ))}
    </div>
  )
}
export default Page